"use strict";

var xpi = require("./xpi");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var fs = require("fs-promise");
var includePrefs = require("./preferences").includePrefs;
var getID = require("jetpack-id");

function extendWith(source, field) {
  return function(value) {
    source[field] = value;
    return source;
  }
}

function removeXPI(options) {
  return fs.unlink(options.xpi).then(function() {
    return options;
  });
}

function execute(manifest, options) {
  options = includePrefs(getID(manifest), options);

  return xpi(manifest, options).
         then(extendWith(options, "xpi")).
         then(function(options) {
           return options.profile || createProfile(options);
         }).
         then(extendWith(options, "profile")).
         then(removeXPI).
         then(runFirefox);
}
module.exports = execute;
