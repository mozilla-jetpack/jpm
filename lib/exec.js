/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var path = require("path");
var child_process = require("child_process");
var execFile = child_process.execFile;

function exec (args, options, callback) {
  console.log("7893298398982")
  options = options || {};
  var env = _.extend({}, options.env, process.env);

  return child_process.exec("node " + path.join(__dirname, "../bin/jpm") + " " + args, {
    cwd: options.cwd || tmpOutputDir,
    env: env
  }, function (err, stdout, stderr) {
    if (callback)
      callback.apply(null, arguments);
    else if (err)
      throw err;
  });
}
exports.exec = exec;
