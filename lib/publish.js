/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var getID = require("jetpack-id");

var AMOClient = require("./amo-client").Client;
var xpi = require("./xpi");


function publish (manifest, program, options) {
  var postURL = options.postUrl;

  var client = new AMOClient({
    apiKey: options.apiKey, apiSecret: options.apiSecret,
    apiUrlPrefix: options.apiUrlPrefix,
  });

  return xpi(manifest, options).then(function (xpiPath) {
    console.log("Successfully created xpi at " + xpiPath);

    return client.publish({
      xpiPath: xpiPath, guid: getID(manifest), version: manifest.version,
    });

  }).then(null, function (err) {
    throw err;
  });
}


module.exports = publish;
