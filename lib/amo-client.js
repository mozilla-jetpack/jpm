/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require('lodash');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var request = require('request');
var when = require("when");
var nodefn = require('when/node');
var logger = require("./utils").console;


/**
 * Construct a new addons.mozilla.org API client.
 *
 * @param {Object} conf
 *   - `apiKey`: API key string from the Developer Hub.
 *   - `apiSecret`: API secret string from the Developer Hub.
 *   - `apiUrlPrefix`: API URL prefix, including any leading paths.
 *   - `signedStatusCheckInterval`: A period in millesconds between
 *     checks when waiting on add-on signing.
 */
function Client(conf) {
  conf = _.assign({
    signedStatusCheckInterval: 1000,
  }, conf);
  this.apiKey = conf.apiKey;
  this.apiSecret = conf.apiSecret;
  this.apiUrlPrefix = conf.apiUrlPrefix;  // default set in CLI options.
  this.signedStatusCheckInterval = conf.signedStatusCheckInterval;

  // Set up external dependencies, allowing for overrides.
  this._validateProgress = conf.validateProgress || new PseudoProgress({
    preamble: 'Validating add-on',
  });
  this._fs = conf.fs || fs;
  this._request = conf.request || request;
}

/**
 * Sign a new version of your add-on at addons.mozilla.org.
 *
 * @param {Object} conf
 *   - `xpiPath` Path to xpi file.
 *   - `guid` add-on GUID, aka the ID in install.rdf.
 *   - `version` add-on version string.
 * @return {Promise}
 */
Client.prototype.sign = function(conf) {
  var self = this;
  conf = conf || {};

  var addonUrl = '/addons/' + encodeURIComponent(conf.guid);
  addonUrl += '/versions/' + encodeURIComponent(conf.version) + '/';

  return this.put({
    url: addonUrl,
    formData: {
      upload: this._fs.createReadStream(conf.xpiPath),
    },
  }, {
    throwOnBadResponse: false,
  }).then(function(responseResult) {
    var httpResponse = responseResult[0];
    var response = responseResult[1];

    var acceptableStatuses = [200];
    if (acceptableStatuses.indexOf(httpResponse.statusCode) === -1) {
      if (typeof response === 'object' && response.error) {
        logger.error('Server response:', response.error,
                     '( status:', httpResponse.statusCode, ')');
        return {success: false};
      }
      throw new Error(
        'Received bad response from the server while signing; ' +
        'status: ' + httpResponse.statusCode + '; ' +
        'response: ' +
        (typeof response === 'string' ? response.substring(0, 100) + '...' : response));
    }

    return self.waitForSignedAddon(addonUrl);
  });
};


/**
 * Poll a status URL, waiting for the queued add-on to be signed.
 *
 * @param {String} URL to GET for add-on status.
 * @return {Promise}
 */
Client.prototype.waitForSignedAddon = function(statusUrl, opt) {
  opt = _.assign({
    clearTimeout: clearTimeout,
    setAbortTimeout: setTimeout,
    setStatusCheckTimeout: setTimeout,
    abortAfter: 45000,
  }, opt);
  var self = this;

  return when.promise(function(resolve, reject) {
    self._validateProgress.animate();
    var statusCheckTimeout;
    var nextStatusCheck;

    function checkSignedStatus() {
      self.get({url: statusUrl}).then(function(result) {
        var data = result[1];
        if (data.processed) {

          self._validateProgress.finish();
          opt.clearTimeout(statusCheckTimeout);
          logger.log('Validation results:', data.validation_url);

          if (data.valid) {
            // TODO: show some validation warnings if there are any.
            // We should show things like 'missing update URL in install.rdf'

            logger.log('Your add-on has been signed:');
            // TODO: actually download the signed files.
            data.files.forEach(function(file) {
              logger.log('    ' + file.download_url);
            });
            resolve({success: true});

          } else {
            logger.log('Your add-on failed validation and could not be signed');
            resolve({success: false});
          }

        } else {
          // The add-on has not been fully processed yet.
          nextStatusCheck = opt.setStatusCheckTimeout(
              checkSignedStatus, self.signedStatusCheckInterval);
        }
      });
    }

    checkSignedStatus();

    statusCheckTimeout = opt.setAbortTimeout(function() {
      self._validateProgress.finish();
      opt.clearTimeout(nextStatusCheck);
      reject(new Error('Validation took too long to complete'));

    }, opt.abortAfter);

  });
};


/**
 * Make a GET request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.get = function() {
  return this.request.apply(
    this, ['get'].concat(Array.prototype.slice.call(arguments)));
};


/**
 * Make a POST request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.post = function() {
  return this.request.apply(
    this, ['post'].concat(Array.prototype.slice.call(arguments)));
};


/**
 * Make a PUT request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.put = function() {
  return this.request.apply(
    this, ['put'].concat(Array.prototype.slice.call(arguments)));
};


/**
 * Make a PATCH request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.patch = function() {
  return this.request.apply(
    this, ['patch'].concat(Array.prototype.slice.call(arguments)));
};


/**
 * Make a DELETE request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype['delete'] = function() {
  return this.request.apply(
    this, ['delete'].concat(Array.prototype.slice.call(arguments)));
};


/**
 * Make any HTTP request to the addons.mozilla.org API.
 *
 * This includes the necessary authorization header.
 *
 * @param {String} method - HTTP method name.
 * @param {Object} requestConf as accepted by the `request` module.
 * @param {Object} options.
 *  - `throwOnBadResponse` - if true, an error will be thrown when not
 *                           response status is not 2xx
 *
 * The returned promise will be resolved with an array of arguments
 * that match the arguments sent to the callback as specified in the
 * `request` module.
 *
 * @return {Promise}
 */
Client.prototype.request = function(method, requestConf, options) {
  method = method.toLowerCase();
  requestConf = requestConf || {};
  var self = this;
  return when.promise(function(resolve, reject) {
    if (!requestConf.url) {
      throw new Error('request URL was not specified');
    }
    requestConf.url = self.apiUrlPrefix + requestConf.url;

    options = _.assign({
      throwOnBadResponse: true,
    }, options);

    var authToken = jwt.sign({iss: self.apiKey}, self.apiSecret, {
      algorithm: 'HS256',
      expiresIn: 60,
    });

    requestConf.headers = {
      Authorization: 'JWT ' + authToken,
      Accept: 'application/json',
    };

    // Get the caller, like request.get(), request.put() ...
    var requestMethod = self._request[method].bind(self._request);
    // Wrap the request callback in a promise. Here is an example without
    // promises:
    //
    // request.put(requestConf, function(err, httpResponse, body) {
    //   // promise gets resolved here
    // })
    //
    resolve(nodefn.call(requestMethod, requestConf));

  }).then(function(responseResult) {
    var httpResponse = responseResult[0];
    var body = responseResult[1];

    if (options.throwOnBadResponse) {
      if (httpResponse.statusCode > 299 || httpResponse.statusCode < 200) {
        throw new Error(
          'Received bad response from the server; ' +
          'status: ' + httpResponse.statusCode + '; ' +
          'response: ' + body.substring(0, 100) + '...');
      }
    }

    if (  httpResponse.headers &&
          httpResponse.headers['content-type'] === 'application/json' &&
          typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {
        logger.log('Failed to parse JSON response from server:', e);
      }
    }

    return [httpResponse, body];
  });
};


/**
 * A pseudo progress indicator.
 *
 * This is just a silly shell animation that was meant to simulate how lots of
 * tests would be run on an add-on file. It sort of looks like a torrent file
 * randomly getting filled in.
 */
function PseudoProgress(conf) {
  conf = _.assign({
    preamble: '',
    setInterval: setInterval,
    clearInterval: clearInterval,
    stdout: process.stdout,
  }, conf);

  this.bucket = [];
  this.interval = null;
  this.motionCounter = 1;

  this.preamble = conf.preamble;
  this.preamble += ' [';
  this.addendum = ']';
  this.setInterval = conf.setInterval;
  this.clearInterval = conf.clearInterval;
  this.stdout = conf.stdout;

  var shellWidth = 80;
  if (this.stdout.isTTY) {
    shellWidth = this.stdout.columns;
  }

  this.emptyBucketPointers = [];
  var bucketSize = shellWidth - this.preamble.length - this.addendum.length;
  for (var i=0; i < bucketSize; i++) {
    this.bucket.push(' ');
    this.emptyBucketPointers.push(i);
  }
}


PseudoProgress.prototype.animate = function(conf) {
  conf = _.assign({
    speed: 100,
  }, conf);
  var self = this;
  var bucketIsFull = false;
  this.interval = this.setInterval(function() {
    if (bucketIsFull) {
      self.moveBucket();
    } else {
      bucketIsFull = self.randomlyFillBucket();
    }
  }, conf.speed);
};


PseudoProgress.prototype.finish = function() {
  this.clearInterval(this.interval);
  this.fillBucket();
};


PseudoProgress.prototype.randomlyFillBucket = function() {
  // randomly fill a bucket (the width of the shell) with dots.
  var self = this;
  var randomIndex = Math.floor(Math.random() * this.emptyBucketPointers.length);
  var pointer = this.emptyBucketPointers[randomIndex];
  this.bucket[pointer] = '.';

  this.showBucket();

  var isFull = true;
  var newPointers = [];
  this.emptyBucketPointers.forEach(function(pointer) {
    if (self.bucket[pointer] === ' ') {
      isFull = false;
      newPointers.push(pointer);
    }
  });
  this.emptyBucketPointers = newPointers;

  return isFull;
};


PseudoProgress.prototype.fillBucket = function() {
  // fill the whole bucket with dots to indicate completion.
  this.bucket = this.bucket.map(function() {
    return '.';
  });
  this.showBucket();
};


PseudoProgress.prototype.moveBucket = function() {
  // animate dots moving in a forward motion.
  for (var i=0; i < this.bucket.length; i++) {
    this.bucket[i] = ((i - this.motionCounter) % 3) ? ' ' : '.';
  }
  this.showBucket();

  this.motionCounter ++;
};


PseudoProgress.prototype.showBucket = function() {
  this.stdout.write('\r' + this.preamble + this.bucket.join('') + this.addendum);
};


exports.Client = Client;
exports.PseudoProgress = PseudoProgress;
