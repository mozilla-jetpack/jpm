/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var getID = require("jetpack-id");

var DefaultAMOClient = require("./amo-client").Client;
var xpi = require("./xpi");


function sign (manifest, program, options, config) {
  config = _.assign({
    systemProcess: process,
    AMOClient: DefaultAMOClient,
  }, config);

  var client = new config.AMOClient({
    apiKey: options.apiKey, apiSecret: options.apiSecret,
    apiUrlPrefix: options.apiUrlPrefix,
  });

  return xpi(manifest, options).then(function (xpiPath) {
    console.log("Successfully created xpi at " + xpiPath);

    return client.sign({
      xpiPath: xpiPath, guid: getID(manifest), version: manifest.version,
    });

  }).then(function(result) {
    console.log(result.success ? 'SUCCESS' : 'FAIL');
    config.systemProcess.exit(result.success ? 0 : 1);
  }, function (err) {
    console.log('FAIL');
    console.error(err.stack);
    config.systemProcess.exit(1);
  });
}


module.exports = sign;
