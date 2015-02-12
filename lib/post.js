/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var extend = require("lodash").extend;
var execute = require("./task");
var http = require("http");
var xpi = require("./xpi");
var cp = require('child_process');
var fs = require('fs');
var url = require('url');

function postXPI (manifest, options) {
  var postURL = options.postUrl;

  return xpi(manifest, options).then(function (xpiPath) {
    console.log("Successfully created xpi at " + xpiPath);

    cp.exec("wget --post-file=" + xpiPath + " " + postURL, {}, function() {
      console.log("Posted XPI to " + postURL);
      fs.unlink(xpiPath);
      console.log("Removed XPI " + xpiPath);
    });
  }).then(null, function (err) {
    console.error(err);
  });
}
module.exports = postXPI;
