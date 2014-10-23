/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var tmp = require("tmp");
var when = require("when");

function createTmpFile(options) {
  return when.promise(function(resolve, reject) {
    tmp.file({
      mode: 0644,
      prefix: options.prefix || "jpm-tmp-",
      postfix: options.postfix || ".txt"
    }, function(err, path, fd) {
      return (err) ? reject(err) : resolve(path);
    });
  });
}
exports.createTmpFile = createTmpFile;
