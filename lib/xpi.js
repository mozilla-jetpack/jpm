var join = require("path").join;
var console = require("./utils").console;
var fs = require("fs-promise");
var zip = require("./zip");
var all = require("when").all;
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
  var xpiName = (manifest.name || "jetpack") + ".xpi";
  var xpiPath = join(cwd, xpiName);

  return zip(cwd, xpiPath).then(function () {
    return xpiPath;
  });
}
module.exports = xpi;
