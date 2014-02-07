var FirefoxProfile = require("firefox-profile");
var getPrefs = require("./preferences").getPrefs;
var defer = require("when").defer;
var fs = require("fs");

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

  profile.updatePreferences();

  // Add add-on to preferences
  if (xpi) {
    profile.addExtension(xpi, function () {
      // Delete generated .xpi file before going any further.
      fs.unlink(xpi, function(error) {
        if (error)
          deferred.reject(error);
        else
          deferred.resolve(profile.profileDir);
      });
    });
  } else {
    deferred.resolve(profile.profileDir);
  }

  return deferred.promise;
}
module.exports = createProfile;

