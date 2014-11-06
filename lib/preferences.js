/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var prefs = require("../data/preferences");
var extend = require("lodash").extend;
var path = require("path");

/**
 * Takes an app string ("firefox") and returns the merged preferences
 * of common prefs with app-specific prefs as an object
 *
 * @param {String} app
 * @return {Object}
 */

function getPrefs (app) {
  // Default and only Firefox supported for the moment
  if (!app)
    app = "firefox";

  var appPrefs = prefs["DEFAULT_" + app.toUpperCase() + "_PREFS"];
  var commonPrefs = prefs.DEFAULT_COMMON_PREFS;

  return extend({}, commonPrefs, appPrefs);
}
exports.getPrefs = getPrefs;

function includePrefs(id, options) {
  var prefs = options.prefs || {};

  if (options.command)
    prefs["extensions." + id + ".sdk.load.command"] = options.command;

  if (options.filter)
    prefs["extensions." + id + ".sdk.test.filter"] = options.filter;

  if (options.times) {
    prefs["extensions." + id + ".sdk.test.iterations"] = parseInt(options.times);
  }

  if (options.doNotQuit) {
    prefs["extensions." + id + ".sdk.test.no-quit"] = true;
    prefs["extensions." + id + ".sdk.test.keepOpen"] = true;
  }

  if (options.profileMemory)
    prefs["extensions." + id + ".sdk.profile.memory"] = true;

  if (options.checkMemory)
    prefs["extensions." + id + ".sdk.profile.leaks"] = true;

  if (options.stopOnError)
    prefs["extensions." + id + ".sdk.test.stop"] = 1;

  if (options.debug) {
    prefs["extensions." + id + ".sdk.debug.show"] = true;
  }

  if (options.tbpl)
    prefs["extensions." + id + ".sdk.output.format"] = "tbpl";

  if (options.verbose)
    prefs["extensions." + id + ".sdk.output.logLevel"] = "verbose";

  if (options.overload && (process.env.JETPACK_ROOT || typeof options.overload === "string")) {
    var root = (typeof options.overload === "string" ?
      options.overload :
      process.env.JETPACK_ROOT).split(path.sep);
    root.push("lib");
    // Normalize the joining of the path to be fileURI (unix) style, regardless of OS
    root = "file:///" + path.join.apply(null, root).replace(path.sep, "/");
    prefs["extensions.modules." + id + ".path."] = root;
  }

  return prefs;
}
exports.includePrefs = includePrefs;
