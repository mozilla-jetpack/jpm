var join = require("path").join;
var createRDF = require("./rdf");
var all = require("when").all;
var fs = require("fs-promise");
var zip = require("./zip");

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
  var cwd = process.cwd();
  var xpiName = (manifest.name || "jetpack") + ".xpi";
  var xpiPath = join(cwd, xpiName);
  options = options || {};

  // This will be removed once AOM fully supports native addons
  if (options.retro) {
    return createFallbacks(manifest).then(function () {
      return doFinalZip(cwd, xpiPath);
    }).then(function (xpiPath) {
      return removeFallbacks().then(function () {
        return xpiPath;
      });
    });
  }
  else {
    return doFinalZip(cwd, xpiPath);
  }
}
module.exports = xpi;

function doFinalZip(cwd, xpiPath) {
  return zip(cwd, xpiPath).then(function () {
    return xpiPath;
  });
}

// Creates bootstrap.js/install.rdf -- will be removed once
// AOM is updated
function createFallbacks (manifest) {
  var cwd = process.cwd();
  var rdfPath = join(cwd, "install.rdf");
  var bsPath = join(cwd, "bootstrap.js");
  var bootstrapSrc = join(__dirname, "../data/bootstrap.js");
  return all([
    fs.writeFile(rdfPath, createRDF(manifest)),
    fs.copy(bootstrapSrc, bsPath)
  ]);
}

function removeFallbacks () {
  var cwd = process.cwd();
  var rdfPath = join(cwd, "install.rdf");
  var bsPath = join(cwd, "bootstrap.js");
  return all([
    fs.remove(bsPath),
    fs.remove(rdfPath)
  ]);
}
