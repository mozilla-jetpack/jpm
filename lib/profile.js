/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var FirefoxProfile = require("firefox-profile");
var getPrefs = require("./preferences").getPrefs;
var defer = require("when").defer;
var console = require("./utils").console;

function createProfile (options) {
  options = options || {};
  var deferred = defer();
  var profile;

  if (options.profile) {
    console.log("Copying provided profile");
    profile = new FirefoxProfile(options.profile);
  }
  else {
    console.log("Creating a new profile");
    profile = new FirefoxProfile();

    // Set default preferences
    var prefs = getPrefs("firefox");
    Object.keys(prefs).forEach(function (pref) {
      profile.setPreference(pref, prefs[pref]);
    });
  }

  // Set any of the preferences passed via options.
  var userPrefs = options.prefs || {};
  Object.keys(userPrefs).forEach(function(key) {
    profile.setPreference(key, userPrefs[key]);
  });

  profile.updatePreferences();

  if (options.verbose) {
    console.log("Using temporary profile at " + profile.profileDir);
  }

  // Add add-on to preferences
  if (options.xpi) {
    profile.addExtension(options.xpi, function () {
      deferred.resolve(profile.profileDir);
    });
  }
  else {
    deferred.resolve(profile.profileDir);
  }

  return deferred.promise;
}

module.exports = createProfile;
