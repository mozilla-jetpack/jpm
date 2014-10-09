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
