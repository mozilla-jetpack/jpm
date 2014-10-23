/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var FirefoxProfile = require("firefox-profile");
var getPrefs = require("./preferences").getPrefs;
var when = require("when");
var console = require("./utils").console;

function makeProfile (options) {
  options = options || {};
  var deferred = when.defer();
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
    profile.updatePreferences();
  }

  if (options.verbose) {
    console.log("Using temporary profile at " + profile.profileDir);
  }

  deferred.resolve(profile);

  return deferred.promise;
}
exports.makeProfile = makeProfile;

// Set any of the preferences passed via options.
function addPrefs(profile, options) {
  var userPrefs = options.prefs || {};

  return when.promise(function(resolve, reject) {
    Object.keys(userPrefs).forEach(function(key) {
      profile.setPreference(key, userPrefs[key]);
    });
    profile.updatePreferences();
    resolve(profile);
  });
}
exports.addPrefs = addPrefs;

function addExtension(profile, options) {
  return when.promise(function(resolve, reject) {
    if (!options.xpi) {
      resolve(profile);
      return;
    }

    profile.addExtension(options.xpi, function() {
      resolve(profile);
    });
  });
}
exports.addExtension = addExtension;

function createProfile(options) {
  options = options || {};
  return makeProfile(options).then(function(profile) {
    return addPrefs(profile, options);
  }).then(function(profile) {
    return addExtension(profile, options);
  }).then(function(profile) {
    return profile.profileDir;
  });
}
exports.createProfile = createProfile;

// profiles that do not include "/" are treated
// as profile names to be used by the firefox profile manager
function isProfileName (profile) {
  return !/[\\\/]/.test(profile);
}

exports.isProfileName = isProfileName;
