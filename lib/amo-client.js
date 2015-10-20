/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require('fs');
var jwt = require('jsonwebtoken');
var request = require('request');
var when = require("when");


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
}

/**
 * Publish a new version of your add-on to addons.mozilla.org.
 *
 * @param {Object} conf
 *   - `xpiPath` Path to xpi file.
 *   - `guid` add-on GUID, aka the ID in install.rdf.
 *   - `version` add-on version string.
 * @return {Promise}
 */
Client.prototype.publish = function(conf) {
  conf = conf || {};
  var self = this;
  return when.promise(function(resolve, reject) {

    var apiUrl = self.apiUrlPrefix;
    apiUrl += '/addons/' + encodeURIComponent(conf.guid);
    apiUrl += '/versions/' + encodeURIComponent(conf.version) + '/';

    var authToken = jwt.sign({iss: self.apiKey}, self.apiSecret, {
      algorithm: 'HS256',
      expiresIn: 60,
    });

    request.put({
      url: apiUrl,
      formData: {
        upload: fs.createReadStream(conf.xpiPath),
      },
      headers: {
        Authorization: 'JWT ' + authToken,
      },
    }, function(err, httpResponse, body) {
      if (err) {
        return reject(err);
      }
      if (httpResponse.statusCode > 299 || httpResponse.statusCode < 200) {
        return reject(new Error(
          'Received bad response from the server; ' +
          'status: ' + httpResponse.statusCode + '; ' +
          'response: ' + body.substring(0, 100) + '...'));
      }
      // TODO: log the download URL and other useful stuff.
      console.log('add-on published successfully, maybe');
      resolve();
    });

  });
};

exports.Client = Client;
