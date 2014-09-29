var FirefoxProfile = require("firefox-profile");
var getPrefs = require("./preferences").getPrefs;
var defer = require("when").defer;
var console = require("./utils").console;

function createProfile (options) {
  options = options || {};
  var profile = new FirefoxProfile();
  var deferred = defer();

  // Set default preferences
  var prefs = getPrefs("firefox");
  Object.keys(prefs).forEach(function (pref) {
    profile.setPreference(pref, prefs[pref]);
  });

  profile.updatePreferences();

  if (options.verbose) {
    console.log("Creating a new profile at " + profile.profileDir);
  }

  deferred.resolve(profile);

  return deferred.promise;
}
module.exports = createProfile;
