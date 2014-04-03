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
         then(function(arg) {
           console.log("Done XPI");
           return arg;
         }).
         then(function(options) {
           return options.profile || createProfile(options);
         }).
         then(function(arg) {
           console.log("Created Profile");
           return arg;
         }).
         then(extendWith(options, "profile")).
         then(removeXPI).
         then(function(arg) {
           console.log("Running Fx");
           return arg;
         }).
         then(function(options) {
           console.log("Running Fx!!");
           runFirefox(options);
         });
}
module.exports = execute;
