/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var _ = require("lodash");
var chai = require("chai");
var expect = chai.expect;
var jwt = require('jsonwebtoken');
var when = require("when");

var amoClient = require('../../lib/amo-client');


describe('amoClient.Client', function() {

  function setUp() {
    var self = this;
    this.apiUrlPrefix = 'http://not-a-real-amo-api.com/api/v3';
    this.client = new amoClient.Client({
      apiKey: 'fake-api-key',
      apiSecret: 'fake-api-secret',
      apiUrlPrefix: this.apiUrlPrefix,
      signedStatusCheckInterval: 0,
      fs: {
        createReadStream: function() {
          return 'fake-read-stream';
        }
      },
      request: new MockRequest(),
      validateProgress: new MockProgress(),
    });
  }

  describe('signing', function() {

    beforeEach(function() {
      setUp.call(this);
      var self = this;

      this.sign = function(conf) {
        conf = _.assign({}, {
          guid: 'some-guid',
          version: 'some-version',
          xpiPath: 'some-xpi-path',
        }, conf);
        return self.client.sign(conf);
      };

      this.waitForSignedAddon = function(url, options) {
        url = url || '/some-status-url';
        options = _.assign({
          setAbortTimeout: function() {},
        }, options);
        return self.client.waitForSignedAddon(url, options);
      };

    });

    function signedResponse(overrides) {
      var res = _.assign({
        processed: true,
        valid: true,
        reviewed: true,
        files: [{
          download_url: 'http://amo/some-signed-file-1.2.3.xpi',
        }],
        validation_url: 'http://amo/validation-results/',
      }, overrides);

      return {
        responseBody: res,
      }
    }

    it('lets you sign an add-on', function(done) {
      var self = this;
      var conf = {
        guid: 'a-guid',
        version: 'a-version',
      };
      var waitForSignedAddon = new CallableMock();
      this.client.waitForSignedAddon = waitForSignedAddon.getCallable();

      this.client._request = new MockRequest({
        httpResponse: {statusCode: 202},
      });

      this.sign(conf).then(function() {
        var putCall = self.client._request.calls[0];
        expect(putCall.name).to.be.equal('put');

        var partialUrl = '/addons/' + conf.guid + '/versions/' + conf.version;
        expect(putCall.conf.url).to.include(partialUrl);
        expect(putCall.conf.formData.upload).to.be.equal('fake-read-stream');

        expect(waitForSignedAddon.wasCalled).to.be.equal(true);
        expect(waitForSignedAddon.call[0]).to.include(partialUrl);

        done();
      }).catch(done);
    });

    it('handles already validated add-ons', function(done) {
      var self = this;
      var waitForSignedAddon = new CallableMock();
      this.client.waitForSignedAddon = waitForSignedAddon.getCallable();

      this.client._request = new MockRequest({
        httpResponse: {statusCode: 409},
        responseBody: {error: 'version already exists'},
      });

      this.sign().then(function(result) {
        expect(waitForSignedAddon.wasCalled).to.be.equal(false);
        expect(result.success).to.be.equal(false);
        done();
      }).catch(done);
    });

    it('throws an error when signing on a 500 server response', function(done) {
      var self = this;
      this.client._request = new MockRequest({httpResponse: {statusCode: 500}});

      this.sign().then(function() {
        done(new Error('unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('Received bad response');
        done();
      }).catch(done);
    });

    it('waits for passing validation', function(done) {
      var self = this;
      var downloadSignedFiles = new CallableMock();
      this.client.downloadSignedFiles = downloadSignedFiles.getCallable();

      var files = [{
        download_url: 'http://amo/the-signed-file-1.2.3.xpi',
      }];
      this.client._request = new MockRequest({
        responseQueue: [
          signedResponse({valid: false, processed: false}),
          signedResponse({valid: true, processed: true, files: files}),
        ],
      });

      var statusUrl = '/addons/something/versions/1.2.3/';
      this.waitForSignedAddon(statusUrl).then(function(result) {
        // Expect exactly two GETs before resolution.
        expect(self.client._request.calls.length).to.be.equal(2);
        expect(self.client._request.calls[0].conf.url).to.include(
          statusUrl);
        expect(downloadSignedFiles.call[0]).to.be.deep.equal(files);
        done();
      }).catch(done);
    });

    it('waits for for fully reviewed files', function(done) {
      var self = this;
      var downloadSignedFiles = new CallableMock();
      this.client.downloadSignedFiles = downloadSignedFiles.getCallable();

      this.client._request = new MockRequest({
        responseQueue: [
          // This is a situation where the upload has been validated
          // but the version object has not been saved yet.
          signedResponse({valid: true, processed: true, reviewed: false}),
          signedResponse({valid: true, processed: true, reviewed: true}),
        ],
      });

      this.waitForSignedAddon().then(function(result) {
        // Expect exactly two GETs before resolution.
        expect(self.client._request.calls.length).to.be.equal(2);
        expect(downloadSignedFiles.wasCalled).to.be.equal(true);
        done();
      }).catch(done);
    });

    it('requires at least one signed file to download', function(done) {
      var downloadSignedFiles = new CallableMock();
      this.client.downloadSignedFiles = downloadSignedFiles.getCallable();
      this.client._request = new MockRequest({
        responseQueue: [
          signedResponse({files: []}),
        ],
      });

      this.waitForSignedAddon().then(function() {
        done(new Error('Unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('API did not return any signed files');
        done();
      }).catch(done);
    });

    it('waits for failing validation', function(done) {
      var self = this;
      this.client._request = new MockRequest({
        responseQueue: [
          signedResponse({valid: false, processed: false}),
          signedResponse({valid: false, processed: true}),
        ],
      });

      this.waitForSignedAddon().then(function(result) {
        // Expect exactly two GETs before resolution.
        expect(self.client._request.calls.length).to.be.equal(2);
        expect(result.success).to.be.equal(false);
        done();
      }).catch(done);
    });

    it('aborts validation check after timeout', function(done) {
      var clearTimeout = new CallableMock();

      this.client.waitForSignedAddon('/status-url', {
        clearTimeout: clearTimeout.getCallable(),
        setStatusCheckTimeout: function() {
          return 'status-check-timeout-id';
        },
        abortAfter: 0,
      }).then(function() {
        done(new Error('Unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('took too long');
        expect(clearTimeout.call[0]).to.be.equal('status-check-timeout-id');
        done();
      }).catch(done);
    });

    it('clears abort timeout after resolution', function(done) {
      var clearTimeout = new CallableMock();
      var self = this;
      this.client._request = new MockRequest({
        responseQueue: [
          signedResponse(),
        ],
      });

      var downloadSignedFiles = new CallableMock();
      this.client.downloadSignedFiles = downloadSignedFiles.getCallable();

      this.waitForSignedAddon('/status-url/', {
        clearTimeout: clearTimeout.getCallable(),
        setAbortTimeout: function() {
          return 'abort-timeout-id';
        },
        setStatusCheckTimeout: function() {
          return 'status-check-timeout-id';
        },
      }).then(function() {
        // Assert that signing resolved successfully.
        expect(downloadSignedFiles.wasCalled).to.be.equal(true);
        // Assert that the timeout-to-abort was cleared.
        expect(clearTimeout.call[0]).to.be.equal('abort-timeout-id');
        done();
      }).catch(done);
    });

    it('downloads signed files', function(done) {
      var fakeResponse = {
        on: function(event, handler) {
          if (event === 'end') {
            // Immediately complete the download.
            handler();
          }
        },
        pipe: function() {},
      };

      var files = signedResponse().responseBody.files;
      var fakeRequest = new CallableMock({returnValue: fakeResponse});
      var createWriteStream = new CallableMock();

      this.client.downloadSignedFiles(files, {
        request: fakeRequest.getCallable(),
        createWriteStream: createWriteStream.getCallable(),
        stdout: {
          write: function() {},
        }
      }).then(function(result) {
        expect(result.success).to.be.equal(true);
        expect(createWriteStream.call[0]).to.be.equal(
          path.join(process.cwd(), 'some-signed-file-1.2.3.xpi'));
        expect(fakeRequest.call[0].url).to.be.equal(files[0].download_url);
        done();
      }).catch(done);
    });

    it('handles download errors', function(done) {
      var fakeResponse = {
        on: function(event, handler) {
          if (event === 'error') {
            // Immediately trigger a download error.
            handler(new Error('some download error'));
          }
        },
        pipe: function() {}
      };

      var files = signedResponse().responseBody.files;
      var fakeRequest = new CallableMock({returnValue: fakeResponse});
      var createWriteStream = new CallableMock();

      this.client.downloadSignedFiles(files, {
        request: fakeRequest.getCallable(),
        createWriteStream: createWriteStream.getCallable(),
        stdout: {
          write: function() {},
        }
      }).then(function() {
        done(new Error('Unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('download error');
        done();
      }).catch(done);
    });
  });


  describe('requests', function() {

    beforeEach(function() {
      setUp.call(this);
    });

    it('makes requests with an auth token', function(done) {
      var self = this;
      var request = {url: '/somewhere'};

      this.client.get(request).then(function() {
        var call = self.client._request.calls[0];
        var headerMatch = call.conf.headers.Authorization.match(/JWT (.*)/);
        var token = headerMatch[1];
        var data = jwt.verify(token, self.client.apiSecret);
        expect(data.iss).to.be.equal(self.client.apiKey);
        expect(data).to.have.keys(['iss', 'iat', 'exp']);
        expect(call.conf).to.be.deep.equal(
            self.client.configureRequest(request));
        done();
      }).catch(done);
    });

    it('lets you configure a request directly', function() {
      var conf = this.client.configureRequest({url: '/path'});
      expect(conf).to.have.keys(['headers', 'url']);
      expect(conf.headers).to.have.keys(['Accept', 'Authorization']);
    });

    it('preserves request headers', function() {
      var headers = {'X-Custom': 'thing'};
      var conf = this.client.configureRequest({
        url: '/path',
        headers: headers,
      });
      expect(conf.headers['X-Custom']).to.be.equal('thing');
    });

    it('allows you to override request headers', function() {
      var headers = {'Accept': 'text/html'};
      var conf = this.client.configureRequest({
        url: '/path',
        headers: headers,
      });
      expect(conf.headers['Accept']).to.be.equal('text/html');
    });

    it('makes relative URLs absolute', function() {
      var urlPath = '/somewhere';
      var conf = this.client.configureRequest({url: urlPath});
      expect(conf.url).to.be.equal(this.apiUrlPrefix + urlPath);
    });

    it('accepts absolute URLs', function() {
      var absUrl = 'http://some-site/somewhere';
      var conf = this.client.configureRequest({url: absUrl});
      expect(conf.url).to.be.equal(absUrl);
    });

    it('can make any HTTP request', function(done) {
      var self = this;
      var requests = [];
      ['get', 'put', 'post', 'patch', 'delete'].forEach(function(method) {
        var urlPath = '/some/path';

        requests.push(self.client[method]({url: urlPath}).then(function() {
          var call = self.client._request.callMap[method];
          expect(call.conf.url).to.be.equal(self.apiUrlPrefix + urlPath);
          expect(call.conf.headers).to.have.keys(['Accept', 'Authorization']);
        }));

      });
      when.all(requests).then(function() { done() }).catch(done);
    });

    it('requires a URL', function() {
      var self = this;
      expect(function() {
        self.client.configureRequest({});
      }).to.throw(Error, /URL was not specified/);
    });

    it('rejects the request promise on > 200 responses', function(done) {
      this.client._request = new MockRequest({httpResponse: {statusCode: 409}});
      this.client.get({url: '/something'}).then(function() {
        done(new Error('unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('Received bad response');
        done();
      }).catch(done);
    });

    it('rejects the request promise on < 200 responses', function(done) {
      this.client._request = new MockRequest({httpResponse: {statusCode: 122}});
      this.client.get({url: '/something'}).then(function() {
        done(new Error('unexpected success'));
      }).catch(function(err) {
        expect(err.message).to.include('Received bad response');
        done();
      }).catch(done);
    });

    it('rejects the request promise with callback error', function(done) {
      var callbackError = new Error('some error');
      this.client._request = new MockRequest({responseError: callbackError});

      this.client.get({url: '/something'}).then(function() {
        done(new Error('unexpected success'));
      }).catch(function(err) {
        expect(err).to.be.equal(callbackError);
        done();
      }).catch(done);
    });

    it('can be configured not to throw on a bad response status', function(done) {
      this.client._request = new MockRequest({httpResponse: {statusCode: 409}});
      this.client.get({
        url: '/something',
      }, {
        throwOnBadResponse: false,
      }).then(function(result) {
        expect(result[0].statusCode).to.be.equal(409);
        done();
      }).catch(done);
    });

    it('resolves the request promise with the HTTP response', function(done) {
      var httpResponse = {statusCode: 201};
      this.client._request = new MockRequest({httpResponse: httpResponse});

      this.client.get({url: '/something'}).then(function(responseResult) {
        var returnedResponse = responseResult[0];
        expect(returnedResponse).to.be.equal(httpResponse);
        done();
      }).catch(done);
    });

    it('resolves the request promise with the response body', function(done) {
      var responseBody = 'some text response';
      this.client._request = new MockRequest({responseBody: responseBody});

      this.client.get({url: '/something'}).then(function(responseResult) {
        var returnedBody = responseResult[1];
        expect(returnedBody).to.be.equal(responseBody);
        done();
      }).catch(done);
    });

    it('resolves the request promise with a JSON object', function(done) {
      var data = {someKey: 'some value'};

      this.client._request = new MockRequest({
        responseBody: JSON.stringify(data),
        httpResponse: {
          statusCode: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      });

      this.client.get({url: '/something'}).then(function(responseResult) {
        var result = responseResult[1];
        expect(result).to.deep.equal(data);
        done();
      }).catch(done);
    });

    it('ignores broken JSON responses', function(done) {
      this.client._request = new MockRequest({
        responseBody: '}{',  // broken JSON
        httpResponse: {
          statusCode: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      });

      this.client.get({url: '/something'}).then(function(responseResult) {
        var result = responseResult[1];
        expect(result).to.be.a('string');
        done();
      }).catch(done);
    });
  });
});


describe('amoClient.formatResponse', function() {

  it('should dump JSON objects', function() {
    var res = amoClient.formatResponse({error: 'some error'});
    expect(res).to.be.equal('{"error":"some error"}');
  });

  it('should truncate long JSON', function() {
    var res = amoClient.formatResponse(
      {error: 'pretend this is really long'},
      {maxLength: 5});
    expect(res).to.be.equal('{"err...');
  });

  it('ignores broken JSON objects', function() {
    var res = amoClient.formatResponse({unserializable: process});  // any complex object
    expect(res).to.be.equal('[object Object]');
  });

  it('should truncate long HTML', function() {
    var res = amoClient.formatResponse(
      '<h1>pretend this is really long</h1>',
      {maxLength: 9});
    expect(res).to.be.equal('<h1>prete...');
  });

  it('should leave short HTML in tact', function() {
    var text = '<h1>404 or whatever</h1>';
    var res = amoClient.formatResponse(text);
    expect(res).to.be.equal(text);
  });

});


describe('amoClient.getUrlBasename', function() {

  it('gets a basename', function() {
    var base = amoClient.getUrlBasename('http://foo.com/bar.zip');
    expect(base).to.be.equal('bar.zip');
  });

  it('strips the query string', function() {
    var base = amoClient.getUrlBasename('http://foo.com/bar.zip?baz=quz');
    expect(base).to.be.equal('bar.zip');
  });

});


describe('amoClient.PseudoProgress', function() {

  beforeEach(function() {
    this.setIntervalMock = new CallableMock({
      returnValue: 'interval-id',
    });
    this.clearIntervalMock = new CallableMock();

    this.progress = new amoClient.PseudoProgress({
      setInterval: this.setIntervalMock.getCallable(),
      clearInterval: this.clearIntervalMock.getCallable(),
      stdout: {
        columns: 80,
        isTTY: true,
        write: function() {},
      },
    });
  });

  it('should set an interval', function() {
    this.progress.animate();
    expect(this.setIntervalMock.wasCalled).to.be.equal(true);
  });

  it('should clear an interval', function() {
    this.progress.animate();
    expect(this.setIntervalMock.wasCalled).to.be.equal(true);
    this.progress.finish();
    expect(this.clearIntervalMock.call[0]).to.be.equal('interval-id');
  });
});


function MockRequest(conf) {
  var self = this;
  var defaultResponse = {
    httpResponse: {statusCode: 200},
    responseBody: '',
    responseError: null,
  };
  conf = _.assign({
    // By default, responses will not be queued.
    // I.E. the same response will be returned repeatedly.
    responseQueue: false,
  }, conf);

  this.responseQueue = conf.responseQueue;
  this.returnMultipleResponses = !!this.responseQueue;

  if (!this.returnMultipleResponses) {
    // If the caller did not queue some responses then assume all
    // configuration should apply to the response.
    this.responseQueue = [conf];
  }

  // Make sure each queued response has the default values.
  this.responseQueue.forEach(function(response, i) {
    self.responseQueue[i] = _.assign({}, defaultResponse, response);
  });

  this.calls = [];
  this.callMap = {};
  this.httpResponse = conf.httpResponse;
  this.responseBody = conf.responseBody;
  this.responseError = conf.responseError;
}

MockRequest.prototype._mockRequest = function(method, conf, callback) {
  var info = {conf: conf};
  this.calls.push(_.assign({}, info, {name: method}));
  this.callMap[method] = info;
  //console.log('MockRequest:', method, conf.url);

  var response;
  if (this.returnMultipleResponses) {
    response = this.responseQueue.shift();
  } else {
    // Always return the same response.
    response = this.responseQueue[0];
  }
  if (!response) {
    response = {};
    response.responseError = new Error('Response queue is empty');
  }
  callback(response.responseError, response.httpResponse, response.responseBody);
};

MockRequest.prototype.get = function(conf, callback) {
  return this._mockRequest('get', conf, callback);
};

MockRequest.prototype.post = function(conf, callback) {
  return this._mockRequest('post', conf, callback);
};

MockRequest.prototype.put = function(conf, callback) {
  return this._mockRequest('put', conf, callback);
};

MockRequest.prototype.patch = function(conf, callback) {
  return this._mockRequest('patch', conf, callback);
};

MockRequest.prototype['delete'] = function(conf, callback) {
  return this._mockRequest('delete', conf, callback);
};


function MockProgress() {};

MockProgress.prototype.animate = function() {};
MockProgress.prototype.finish = function() {};


function CallableMock(conf) {
  conf = _.assign({
    returnValue: undefined,
  }, conf);
  this.call = null;
  this.wasCalled = false;
  this.returnValue = conf.returnValue;
}

CallableMock.prototype._call = function() {
  this.call = arguments;
  this.wasCalled = true;
  return this.returnValue;
};

CallableMock.prototype.getCallable = function() {
  return this._call.bind(this);
};
