var FirefoxProfile = require("firefox-profile");
var getPrefs = require("./preferences").getPrefs;
var defer = require("when").defer;
var console = require("./utils").console;

function createProfile (options) {
  options = options || {};
  var profile = new FirefoxProfile();
  var xpi = options.xpi;
  var deferred = defer();

  // Set default preferences
  var prefs = getPrefs("firefox");
  Object.keys(prefs).forEach(function (pref) {
    profile.setPreference(pref, prefs[pref]);
  });

  // Set any of the preferences passed via options.
  var userPrefs = options.prefs || {};
  Object.keys(userPrefs).forEach(function(key) {
    profile.setPreference(key, userPrefs[key]);
  });

  profile.updatePreferences();

  if (options.verbose) {
    console.log("Creating a new profile at " + profile.profileDir);
  }

  // Add add-on to preferences
  if (xpi) {
    profile.addExtension(xpi, function () {
      deferred.resolve(profile.profileDir);
    });
  } else {
    deferred.resolve(profile.profileDir);
  }

  return deferred.promise;
}
module.exports = createProfile;

