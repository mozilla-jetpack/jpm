/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require("fs-promise");
var path = require("path");
var when = require("when");
var init = require("./init");
var sanitizeName = require("./utils").sanitizeName;

function new_(name, options) {
  return when.promise(function(resolve, reject) {
      if (!name) {
          return reject("`jpm new` requires a name to be specified.")
      }

      if (name === ".") {
          return reject("Trying to generate an addon in this directory? Use " +
                        "`jpm init` instead.");
      }

      var sanitizedName = sanitizeName(name);

      var absPath = path.join(process.cwd(), sanitizedName);

      fs.mkdir(absPath, function(err) {
        if (err) {
          return reject("A project named \"" + name + "\" already exists.");
        } else {
          process.chdir(absPath);
          return resolve();
        }
      });
  })
    .then(init)
    .catch(console.error);
}

module.exports = new_;
