/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var chai = require("chai");
var expect = chai.expect;
var jwt = require('jsonwebtoken');
var when = require("when");

var utils = require("../utils");
var AMOClient = require('../../lib/amo-client').Client;


describe('amoClient.Client', function() {

  beforeEach(function() {
    utils.setup();
    var self = this;

    this.client = new AMOClient({
      apiKey: 'fake-api-key',
      apiSecret: 'fake-api-secret',
      apiUrlPrefix: 'http://not-a-real-amo-api.com/api/v3',
      fs: {
        createReadStream: function() {
          return 'fake-read-stream';
        }
      },
      request: new MockRequest(),
    });

    this.sign = function(conf) {
      conf = _.assign({}, {
        guid: 'some-guid',
        version: 'some-version',
        xpiPath: 'some-xpi-path',
      }, conf);
      return self.client.sign(conf);
    };
  });

  afterEach(utils.tearDown);

  it('lets you sign an add-on', function(done) {
    var self = this;
    var conf = {
      guid: 'a-guid',
      version: 'a-version',
    };

    this.sign(conf).then(function() {
      var call = self.client._request.calls[0];
      expect(call.name).to.be.equal('put');
      expect(call.conf.url).to.include(
          '/addons/' + conf.guid + '/versions/' + conf.version);
      expect(call.conf.formData.upload).to.be.equal('fake-read-stream');
      done();
    }).catch(done);
  });

  it('makes requests with an auth token', function(done) {
    var self = this;

    this.sign().then(function() {
      var call = self.client._request.calls[0];
      var headerMatch = call.conf.headers.Authorization.match(/JWT (.*)/);
      var token = headerMatch[1];
      var data = jwt.verify(token, self.client.apiSecret);
      expect(data.iss).to.be.equal(self.client.apiKey);
      expect(data).to.have.keys(['iss', 'iat', 'exp']);
      done();
    }).catch(done);
  });

  it('can make any HTTP request', function(done) {
    var self = this;
    var requests = [];
    ['get', 'put', 'post', 'patch', 'delete'].forEach(function(method) {
      var urlPath = '/some/path';

      requests.push(self.client[method]({url: urlPath}).then(function() {
        var call = self.client._request.callMap[method];
        expect(call.conf.url).to.be.equal(self.client.apiUrlPrefix + urlPath);
        expect(call.conf.headers).to.have.keys(['Accept', 'Authorization']);
      }));

    });
    when.all(requests).then(function() { done() }).catch(done);
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


function MockRequest(conf) {
  conf = _.assign({}, {
    httpResponse: {statusCode: 200},
    responseBody: '',
    responseError: null,
  }, conf);

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
  callback(this.responseError, this.httpResponse, this.responseBody);
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
