var os = require("os");
var xpi = require("./xpi");
var FirefoxProfile = require("firefox-profile");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var fs = require("fs-promise");
var includePrefs = require("./preferences").includePrefs;
var getID = require("jetpack-id");
var defer = require("when").defer;

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

  if (~["run", "test"].indexOf(options.command)) {
    options.xpiPath = os.tmpdir();
  }

  return xpi(manifest, options)
    .then(extendWith(options, "xpi"))
    // determine the profile to use
    .then(function(options) {
      if (options.profile) {
        console.log("Using provided profile");
        return new FirefoxProfile(options.profile);
      }
      return createProfile(options);
    })
    // add the xpi to the profile, and add user settings
    .then(function(profile) {
      var deferred = defer();
      var xpi = options.xpi;

      // Set any of the preferences passed via options.
      var userPrefs = options.prefs || {};
      Object.keys(userPrefs).forEach(function(key) {
        profile.setPreference(key, userPrefs[key]);
      });

      profile.updatePreferences();

      // Add add-on to preferences
      if (xpi) {
        profile.addExtension(xpi, function () {
          deferred.resolve(profile.profileDir);
        });
      }
      else {
        deferred.resolve(profile.profileDir);
      }

      return deferred.promise;
    })
    // add profile dir to the options
    .then(extendWith(options, "profile"))
    // remote the temp xpi
    .then(removeXPI)
    .then(function (options) {
      return runFirefox(manifest, options);
    });
}
module.exports = execute;
