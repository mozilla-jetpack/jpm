/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require('fs');
var jwt = require('jsonwebtoken');
var request = require('request');
var when = require("when");
var nodefn = require('when/node');


/**
 * Construct a new addons.mozilla.org API client.
 *
 * @param {Object} conf
 *   - `apiKey` API key string from the Developer Hub.
 *   - `apiSecret` API secret string from the Developer Hub.
 *   - `apiUrlPrefix` API URL prefix, including any leading paths.
 */
function Client(conf) {
  conf = conf || {};
  this.apiKey = conf.apiKey;
  this.apiSecret = conf.apiSecret;
  this.apiUrlPrefix = conf.apiUrlPrefix;
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
  conf = conf || {};

  var apiUrl = '/addons/' + encodeURIComponent(conf.guid);
  apiUrl += '/versions/' + encodeURIComponent(conf.version) + '/';

  return this.put({
    url: apiUrl,
    formData: {
      upload: this._fs.createReadStream(conf.xpiPath),
    },
  }).then(function(responseResult) {
    var httpResponse = responseResult[0];
    var response = responseResult[1];

    console.log('Your add-on file is being processed');
    console.log('Job ID:', response.id)
    console.log('Not yet implemented: polling until completion, downloading the signed XPI');

    return responseResult;
  });
};


/**
 * Make a GET request.
 *
 * @param {Object} conf as accepted by the `request` module.
 * @return {Promise}
 */
Client.prototype.get = function(conf) {
  return this.request('get', conf);
};


/**
 * Make a POST request.
 *
 * @param {Object} conf as accepted by the `request` module.
 * @return {Promise}
 */
Client.prototype.post = function(conf) {
  return this.request('post', conf);
};


/**
 * Make a PUT request.
 *
 * @param {Object} conf as accepted by the `request` module.
 * @return {Promise}
 */
Client.prototype.put = function(conf) {
  return this.request('put', conf);
};


/**
 * Make a PATCH request.
 *
 * @param {Object} conf as accepted by the `request` module.
 * @return {Promise}
 */
Client.prototype.patch = function(conf) {
  return this.request('patch', conf);
};


/**
 * Make a DELETE request.
 *
 * @param {Object} conf as accepted by the `request` module.
 * @return {Promise}
 */
Client.prototype['delete'] = function(conf) {
  return this.request('delete', conf);
};


/**
 * Make any HTTP request to the addons.mozilla.org API.
 *
 * This includes the necessary authorization header.
 *
 * @param {String} method - HTTP method name.
 * @param {Object} conf as accepted by the `request` module.
 *
 * The returned promise will be resolved with an array of arguments
 * that match the arguments sent to the callback as specified in the
 * `request` module.
 *
 * @return {Promise}
 */
Client.prototype.request = function(method, conf) {
  method = method.toLowerCase();
  conf.url = this.apiUrlPrefix + conf.url;

  var authToken = jwt.sign({iss: this.apiKey}, this.apiSecret, {
    algorithm: 'HS256',
    expiresIn: 60,
  });

  conf.headers = {
    Authorization: 'JWT ' + authToken,
    Accept: 'application/json',
  };

  var requestMethod = this._request[method].bind(this._request);
  // Wrap the request callback in a promise. Here is an example without
  // promises:
  //
  // request.put(conf, function(err, httpResponse, body) {
  //   // promise gets resolved here
  // })
  //
  return nodefn.call(requestMethod, conf).then(function(responseResult) {
    var httpResponse = responseResult[0];
    var body = responseResult[1];

    if (httpResponse.statusCode > 299 || httpResponse.statusCode < 200) {
      throw new Error(
        'Received bad response from the server; ' +
        'status: ' + httpResponse.statusCode + '; ' +
        'response: ' + body.substring(0, 100) + '...');
    }

    if (  httpResponse.headers &&
          httpResponse.headers['content-type'] === 'application/json' &&
          typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {
        console.log('Failed to parse JSON response from server:', e);
      }
    }

    return [httpResponse, body];
  });
};


exports.Client = Client;
