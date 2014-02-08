var join = require("path").join;
var fs = require("fs");
var when = require("when");
//var console = require("./utils").console;

/**
 * Takes a manifest object (from package.json) and build options
 * and validates the information available in the addon.
 *
 * @param {Object} manifest
 * @param {Object} options
 * @return {Promise}
 */

function validate (manifest, options) {

  var dir = process.cwd();
  var isValid = true;
  var deferred = when.defer();
  options = options || {};

  // Check `id`
  if (!validateID(manifest))
    isValid = false;

  if (!validateMain(manifest, dir))
    isValid = false;

  isValid ? deferred.resolve() : deferred.reject();
  return deferred.promise;
}
module.exports = validate;

var INVALID_ID = "`id` in `package.json` must be a valid ID, as either a GUID" +
                 ", or a formatted string such as `extensionname@example.org`. " +
                 "\n" +
                 "Example IDs:\n" +
                 "  '{930a4f32-54e4-109c-929b-9209abc8de4f}'\n" +
                 "  'myextension@jetpack'\n" +
                 "  'wonderfuladdon@example.jetpack.org'\n"+
                 "\n" +
                 "More information on valid IDs can be at the following URL:\n" +
                 "https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#id";

var INVALID_MAIN_DNE = "The addon has no valid entry point. Either create an entry " +
                       "point at `./index.js`, or set the `main` property to a valid " +
                       "path in your addon.";

function validateID (manifest) {
  console.log(!manifest.id, !isGUID(manifest.id), !isDomain(manifest.id))
  if (!manifest.id || (!isGUID(manifest.id) && !isDomain(manifest.id))) {
//    console.error(INVALID_ID);
    return false;
  }
  return true;
}
validate.validateID = validateID;

function validateMain (manifest, dir) {
  // Check valid entry point
  if (manifest.main) {
    var main = join(dir, manifest.main);
    try {
      fs.statSync(main).isFile();
    } catch (e) {
      console.error(INVALID_MAIN_DNE);
      return false;
    }
  } else {
    try {
      fs.statSync(join(dir, "index.js")).isFile();
    } catch (e) {
      console.error(INVALID_MAIN_DNE);
      return false;
    }
  }
  return true;
}
validate.validateMain = validateMain;

function isGUID (s) {
  return /^\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/i.test(s);
}

function isDomain (s) {
  return /^[0-9a-zA-Z\-]+\@[0-9a-zA-Z\-]+(\.[0-9a-zA-Z\-]+)*$/.test(s);
}
