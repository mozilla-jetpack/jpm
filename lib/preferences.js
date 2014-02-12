var prefs = require("../data/preferences");
var _ = require("underscore");
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

  return _.extend({}, commonPrefs, appPrefs);
}
exports.getPrefs = getPrefs;

function includePrefs(id, options) {
  var prefs = options.prefs || {};
  var sdkPath = options.sdkPath || process.env.JETPACK_PATH;
  var sdkURI = sdkPath && "file://" + path.resolve(sdkPath) + "/lib/";

  if (options.command)
    prefs["extensions." + id + ".sdk.load.command"] = options.command;

  if (options.filter)
    prefs["extensions." + id + ".sdk.test.filter"] = options.filter;

  if (options.profileMemory)
    prefs["extensions." + id + ".sdk.profile.memory"] = options.profileMemory;

  if (options.stopOnError)
    prefs["extensions." + id + ".sdk.test.stop"] = 1;

  if (options.tbpl)
    prefs["extensions." + id + ".sdk.output.format"] = "tbpl";

  if (options.verbose)
    prefs["extensions." + id + ".sdk.output.logLevel"] = "verbose";

  if (sdkURI)
    prefs["extensions.modules." + id + ".path."] = sdkURI;

  return _.extend(options, { prefs: prefs });
}
exports.includePrefs = includePrefs;
