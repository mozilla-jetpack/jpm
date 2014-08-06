var join = require("path").join;
var createRDF = require("./rdf");
var when = require("when");
var fs = require("fs-promise");
var getID = require("jetpack-id");
var validate = require("./validate");
var zip = require("./zip");
var console = require("./utils").console;
var hasAOMSupport = require("./utils").hasAOMSupport;

/**
 * Takes a manifest object (from package.json) and build options
 * object and zipz up the current directory into a XPI, copying
 * over default `install.rdf` and `bootstrap.js` if needed
 * and not yet defined. Returns a promise that resolves
 * upon completion.
 *
 * @param {Object} manifest
 * @param {Object} options
 *   - `xpiPath` Path where xpi should be saved. Used by `run`, `test` to indicate
 *               that the xpi saved in a temp directory.
 * @return {Promise}
 */

function xpi (manifest, options) {

  options = options || {};

  var dir = process.cwd();
  var xpiName = getID(manifest) + ".xpi";

  var xpiPath = join(options.xpiPath || dir, xpiName);
  var useFallbacks = !(options.forceAOM || hasAOMSupport(manifest));

  if (useFallbacks && options.verbose) {
    console.log("Creating compatability bootstrap.js and install.rdf for xpi");
  }

  return validate(dir)
    .then(createFallbacks)
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
    return zip(options, dir, xpiPath);
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
