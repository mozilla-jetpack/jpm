var join = require("path").join;
var console = require("./utils").console;
var fs = require("fs-promise");
var zip = require("./zip");
var all = require("when").all;
var createRDF = require("./rdf");
var bootstrapSrc = join(__dirname, "../data/bootstrap.js");

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
  var rdfPath = join(cwd, "install.rdf");
  var bootstrapPath = join(cwd, "bootstrap.js");
  var existingRDF = false;
  var existingBS = false;
  var xpiName = (manifest.name || "jetpack") + ".xpi";
  var xpiPath = join(cwd, xpiName);

  return all([
    fs.exists(rdfPath),
    fs.exists(bootstrapPath)
  ]).then(function (exists) {
    existingRDF = exists[0];
    existingBS = exists[1];

    // Copy over default `bootstrap.js` or `install.rdf` if
    // they do not exist already
    var tasks = [];
    if (!existingRDF)
      tasks.push(fs.writeFile(rdfPath, createRDF(manifest)));
    if (!existingBS)
      tasks.push(fs.copy(bootstrapSrc, bootstrapPath));

    return all(tasks);
  }).then(function () {
    // Zip up all directory into XPI
    return zip(cwd, xpiPath);
  }).then(function () {
    // Clean up bootstrap/install.rdf if copied in
    var tasks = [];
    if (!existingRDF)
      tasks.push(fs.remove(rdfPath));
    if (!existingBS)
      tasks.push(fs.remove(bootstrapPath));
    return all(tasks);
  }).then(function () {
    return xpiPath;
  });
}
module.exports = xpi;
