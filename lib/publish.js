/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var getID = require("jetpack-id");
var jwt = require('jsonwebtoken');
var fs = require('fs');
var request = require('request');

var xpi = require("./xpi");


function publish (manifest, program, options) {
  var postURL = options.postUrl;

  var guid = getID(manifest);
  var apiUrl = options.apiUrlPrefix;
  apiUrl += '/addons/' + encodeURIComponent(guid);
  apiUrl += '/versions/' + encodeURIComponent(manifest.version) + '/';

  var authToken = jwt.sign({iss: options.apiKey}, options.apiSecret, {
    algorithm: 'HS256',
    expiresIn: 60,
  });

  return xpi(manifest, options).then(function (xpiPath) {
    console.log("Successfully created xpi at " + xpiPath);

    request.put({
      url: apiUrl,
      formData: {
        upload: fs.createReadStream(xpiPath),
      },
      headers: {
        Authorization: 'JWT ' + authToken,
      },
    }, function(err, httpResponse, body) {
      if (err) {
        return console.error('upload failed:', err);
      }
      if (httpResponse.statusCode > 299 || httpResponse.statusCode < 200) {
        return console.error('Status:', httpResponse.statusCode, 'body:',
                             body);
      }
      console.log('Upload successful!  Server responded with:', body);
    });

  }).then(null, function (err) {
    console.error(err);
  });
}


module.exports = publish;
