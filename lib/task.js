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
var when = require("when");
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
  options = options || {};
  var id = getID(manifest);

  if (~["run", "test"].indexOf(options.command)) {
    options.xpiPath = os.tmpdir();
  }

  return setupPrefs(id, options)
    .then(function() {
      return xpi(manifest, options);
    })
    .then(extendWith(options, "xpi"))
    .then(profile.createProfile)
    .then(extendWith(options, "profile"))
    .then(removeXPI)
    .then(function (options) {
      return runFirefox(manifest, options);
    });
}
module.exports = execute;

function setupPrefs(id, options) {
  return when.promise(function(resolve) {
    if (options.prefs) {
      console.log("Using custom preferences " + options.prefs);
      options.prefs = require(path.resolve(options.prefs));
    }
    else {
      options.prefs = {};
    }
    options.prefs = includePrefs(id, options);
    return resolve(options);
  });
}
exports.setupPrefs = setupPrefs;
