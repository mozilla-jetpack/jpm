var _ = require("underscore");
var xpi = require("./xpi");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var console = require("./utils").console;
var fs = require("fs-promise");

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

function run (manifest, options) {
  // Generate XPI and get the path
  return xpi(manifest, options).
         then(extendWith(options, "xpi")).
         then(function(options) {
           return options.profile || createProfile(options);
         }).
         then(extendWith(options, "profile")).
         then(removeXPI).
         then(runFirefox)
}
module.exports = run;
