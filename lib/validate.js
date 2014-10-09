/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var when = require("when");
var jetpackValidation = require("jetpack-validation");
var console = require("./utils").console;

var ERRORS = ["main", "id", "parsing"];
var WARNINGS = ["version", "title", "name"];

function validate (dir) {
  var errors = jetpackValidation(dir);

  return when.promise(function (resolve, reject) {
    Object.keys(errors).forEach(function (errorType) {
      if (~ERRORS.indexOf(errorType)) {
        reject(new Error(errors[errorType]));
      }
      if (~WARNINGS.indexOf(errorType)) {
        console.warn(errors[errorType]);
      }
    });
    resolve();
  });
}

module.exports = validate;
