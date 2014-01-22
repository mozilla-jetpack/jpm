var _ = require("underscore");
var xpi = require("./xpi");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var console = require("./utils").console;

function run (manifest, options) {
  // Generate XPI and get the path
  return xpi(manifest, options).then(function (xpiPath) {
    // Create a profile so we can instantiate an instance
    // of Firefox using the profile with the add-on installed
    return createProfile({
      xpi: xpiPath
    });
  }).then(function (profilePath) {
    return runFirefox(_.extend({}, options, {
      profile: profilePath
    }));
  }).then(function (proc) {

  });
}
module.exports = run;
