var join = require("path").join;
var createRDF = require("./rdf");
var when = require("when");
var fs = require("fs-promise");
var zip = require("./zip");
var console = require("./utils").console;
var hasAOMSupport = require("./utils").hasAOMSupport;
var getID = require("./utils").getID;

/**
 * Takes a manifest object (from package.json) and build options
 * object and zipz up the current directory into a XPI, copying
 * over default `install.rdf` and `bootstrap.js` if needed
 * and not yet defined. Returns a promise that resolves
 * upon completion.
 *
 * @param {Object} manifest
 * @param {Object} options
 * @return {Promise}
 */

function xpi (manifest, options) {

  options = options || {};
  var dir = process.cwd();
  var xpiName = getID(manifest) + ".xpi";

  var xpiPath = join(dir, xpiName);
  var useFallbacks = !(options.forceAOM || hasAOMSupport(manifest));

  var sdkPath = typeof options.overload === "string" ?
    options.overload :
    process.env.JETPACK_ROOT;

  return createFallbacks()
    .then(createZip)
    .then(removeFallbacks)
    .then(function () {
      return xpiPath;
    });

  // Creates bootstrap.js/install.rdf -- will be removed once
  // AOM is updated
  function createFallbacks () {
    if (!useFallbacks)
      return when.resolve();
    var rdfPath = join(dir, "install.rdf");
    var bsPath = join(dir, "bootstrap.js");
    var bootstrapSrc = join(__dirname, "../data/bootstrap.js");
    return when.all([
      fs.writeFile(rdfPath, createRDF(manifest)),
      fs.copy(bootstrapSrc, bsPath)
    ]);
  }

  function createZip () {
    console.log("Creating XPI at ", xpiPath);
    return zip(dir, xpiPath);
  }

  function removeFallbacks () {
    if (!useFallbacks)
      return when.resolve();
    var rdfPath = join(dir, "install.rdf");
    var bsPath = join(dir, "bootstrap.js");
    return when.all([
      fs.remove(bsPath),
      fs.remove(rdfPath)
    ]);
  }
}
module.exports = xpi;

/**
 * Vestigial overloading of SDK functions below. Possibly unneeded
 * based off of manifest's aliases.
 */
function overloadSDK (dir, sdkPath) {
  var localSDKPath = join(dir, "addon-sdk/lib");
  return fs.copy(join(sdkPath, "lib"), localSDKPath);
}

function addOverloadConfig (dir) {
  var file = join(dir, "config.json");
  return fs.exists(file).then(function (exists) {
    if (!exists) {
      return fs.writeFile(file, JSON.stringify({"is-sdk-bundled":true}));
    } else {
      var json = JSON.parse(fs.readFileSync(file));
      json["is-sdk-bundled"] = true;
      return fs.writeFile(file, JSON.stringify(json));
    }
  });
}


function removeSDK (dir) {
  var localSDKPath = join(dir, "addon-sdk");
  return fs.remove(localSDKPath);
}
