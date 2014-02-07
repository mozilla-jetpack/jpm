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

  var dir = process.cwd();
  var xpiName = getID(manifest) + ".xpi";


  var xpiPath = join(dir, xpiName);
  options = options || {};
  var sdkPath = typeof options.overload === "string" ?
    options.overload :
    process.env.JETPACK_ROOT;

  return when.promise(function (resolve) {
    if (options.forceAOM || hasAOMSupport(manifest))
      resolve(true);
    else
      resolve(createFallbacks(manifest, dir));
  }).then(function () {
    if (options.overload)
      return overloadSDK(dir, sdkPath).then(function () {
        return addOverloadConfig(dir);
      });
  }).then(function () {
    console.log("Creating XPI at ", xpiPath);
    return createZip(dir, xpiPath);
  }).then(function () {
    if (options.retro)
      return removeFallbacks(dir);
  }).then(function () {
    if (options.overload)
      return removeSDK(dir);
  }).then(function () {
    return xpiPath;
  });
}
module.exports = xpi;

function createZip (dir, xpiPath) {
  return zip(dir, xpiPath).then(function () {
    return xpiPath;
  });
}

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

// Creates bootstrap.js/install.rdf -- will be removed once
// AOM is updated
function createFallbacks (manifest, dir) {
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");
  var bootstrapSrc = join(__dirname, "../data/bootstrap.js");
  return when.all([
    fs.writeFile(rdfPath, createRDF(manifest)),
    fs.copy(bootstrapSrc, bsPath)
  ]);
}

function removeFallbacks (dir) {
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");
  return when.all([
    fs.remove(bsPath),
    fs.remove(rdfPath)
  ]);
}

function removeSDK (dir) {
  var localSDKPath = join(dir, "addon-sdk");
  return fs.remove(localSDKPath);
}
