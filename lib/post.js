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
var net = require('net');

function postXPI (manifest, options) {
  var postURL = options.postUrl;

  return xpi(manifest, options).then(function (xpiPath) {
    console.log("Successfully created xpi at " + xpiPath);

    fs.readFile(xpiPath, null, function(err, buffer) {
      var p = url.parse(postURL);
      var client = net.connect({
        host: p.hostname,
        port: p.port
      }, function() {
        var identifier = new Buffer('\rPOST / HTTP/1.1\n\rUser-Agent: NodeJS Compiler\n\r\n');
        client.write(identifier);
        client.end(buffer);
      });
      client.on('data', function(data) {
        // Extension Auto-Installer does not close the connection, so we do it after 500ms
        setTimeout(function() {
          client.destroy();
        }, 500);
      });
      client.on('error', function (e) {
        // if net errors need to be propagated.
      });
      client.on('close', function (had_error) {
        console.log(had_error ? "Posting XPI to %s failed" : "Posted XPI to %s", postURL);
        fs.unlink(xpiPath);
        console.log("Removed XPI from " + xpiPath);
      });
    });
  }).then(null, function (err) {
    console.error(err);
  });
}
module.exports = postXPI;
