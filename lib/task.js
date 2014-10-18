/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var os = require("os");
var xpi = require("./xpi");
var profile = require("./profile");
var runFirefox = require("./firefox");
var fs = require("fs-promise");
var includePrefs = require("./preferences").includePrefs;
var getID = require("jetpack-id");
var defer = require("when").defer;
var path = require("path");
var console = require("./utils").console;

function extendWith(source, field) {
  return function(value) {
    source[field] = value;
    return source;
  };
}

function removeXPI(options) {
  return fs.unlink(options.xpi).then(function() {
    return options;
  });
}

function execute(manifest, options) {
  if (~["run", "test"].indexOf(options.command)) {
    options.xpiPath = os.tmpdir();
  }

  var getUserPrefsPromise = defer();
  if (options.prefs) {
    console.log("Using custom preferences " + options.prefs);
    options.prefs = require(path.resolve(options.prefs));
  }
  else {
    options.prefs = {};
  }
  getUserPrefsPromise.resolve();

  return getUserPrefsPromise.promise
    .then(function() {
      options.prefs = includePrefs(getID(manifest), options);
      return xpi(manifest, options);
    })
    .then(extendWith(options, "xpi"))
    .then(function(options) {
      if (options.profile && profile.isProfileName(options.profile)) {
        return options.profile;
      }
      return profile.createProfile(options);
    })
    // add profile dir to the options
    .then(extendWith(options, "profile"))
    // remove the temp xpi
    .then(removeXPI)
    .then(function (options) {
      return runFirefox(manifest, options);
    });
}
module.exports = execute;
