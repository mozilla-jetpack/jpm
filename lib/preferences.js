var prefs = require("../data/preferences");
var _ = require("underscore");

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

  return _.extend({}, commonPrefs, appPrefs);
}
exports.getPrefs = getPrefs;
