var join = require("path").join;
var fs = require("fs");
var when = require("when");
var getID = require("jetpack-id");
var console = require("./utils").console;

/**
 * Takes a root directory for an addon, where the package.json lives,
 * and build options and validates the information available in the addon.
 *
 * @param {Object} rootPath
 * @param {Object} options
 * @return {Promise}
 */

function validate (rootPath, options) {

  var manifest = JSON.parse(fs.readFileSync(join(rootPath, "package.json")));
  var deferred = when.defer();
  var errors = Object.create({
    toString: function () {
      var errorObj = this;
      return Object.keys(this).map(function (key) { return errorObj[key]; }).join('\n');
    }
  });
  options = options || {};

  // Check `id`
  if (!validateID(manifest)) {
    errors.id = INVALID_ID;
  }

  if (!validateMain(manifest, rootPath)) {
    errors.main = INVALID_MAIN_DNE;
  }

  if (!validateName(manifest)) {
    errors.name = INVALID_NAME;
  }

  !Object.keys(errors).length ? deferred.resolve() : deferred.reject(errors);
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

var INVALID_NAME = "The `name` property must be specified in package.json.";

function validateID (manifest) {
  if (!manifest.id)
    return true;
  if (!isGUID(manifest.id) && !isDomain(manifest.id)) {
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
      return false;
    }
  } else {
    try {
      fs.statSync(join(dir, "index.js")).isFile();
    } catch (e) {
      return false;
    }
  }
  return true;
}
validate.validateMain = validateMain;

function validateName (manifest) {
  var name = manifest.name;
  return !!(name && typeof name === "string" && name.length);
}
exports.validateName = validateName;

function isGUID (s) {
  return /^\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/i.test(s);
}

function isDomain (s) {
  return /^[0-9a-zA-Z\-_]*\@[0-9a-zA-Z\-]+(\.[0-9a-zA-Z\-]+)*$/.test(s);
}
