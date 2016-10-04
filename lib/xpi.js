/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var join = require("path").join;
var getID = require("jetpack-id");
var validate = require("./validate");
var utils = require("./xpi/utils");
var console = require("./utils").console;
var _ = require("lodash");

/**
 * Takes a manifest object (from package.json) and build options
 * object and zipz up the current directory into a XPI, copying
 * over default `install.rdf` and `bootstrap.js` if needed
 * and not yet defined. Returns a promise that resolves
 * upon completion.
 *
 * @param {Object} manifest
 * @param {Object} options
 *   - `destDir` Directory path where xpi should be saved.
 *   - `xpiPath` Legacy alias for `destDir`. Used by `run` and `test` to
 *               save the xpi to a temp directory.
 * @return {Promise}
 */

function xpi(manifest, options) {
  options = options || {};
  var addonDir = options.addonDir || process.cwd();
  var xpiVersion = manifest.version ? ("-" + manifest.version) : "";
  var xpiName;
  if (manifest.name) {
    // checking that the name only contains save characters for any file system:
    //   alphanumerics, dash, underscore, dot and at
    if (manifest.name.match(/^[a-z0-9_\-\.@]+$/i)) {
      xpiName = manifest.name;
    } else {
      console.warn(
        "The provided addon name \"" +
        manifest.name +
        "\" is not a valid filename. Using ID instead."
      );
    }
  }
  if (!xpiName) {
    xpiName = getID(manifest) + xpiVersion;
  }
  xpiName += ".xpi";
  var updateRdfName = getID(manifest) + xpiVersion + ".update.rdf";
  var outputPath = options.xpiPath || options.destDir || addonDir;
  var xpiPath = join(outputPath, xpiName);
  var updateRdfPath = join(outputPath, updateRdfName);

  options = _.merge(options, {
    addonDir: addonDir,
    xpiName: xpiName,
    xpiPath: xpiPath,
    useFallbacks: true,
    needsInstallRDF: undefined,
    needsBootstrapJS: undefined,
    bootstrapSrc: require.resolve("jpm-core/data/bootstrap.js")
  });

  return utils.checkNeedsFallbacks(options)
    .then(function() {
      if (options.needsBootstrapJS || options.needsInstallRDF) {
        if (options.verbose) {
          console.log("Validating the manifest");
        }
        return validate(options.addonDir);
      }
      return null;
    })
    .then(function() {
      return utils.createFallbacks(options);
    })
    .then(function(fallbacks) {
      options.fallbacks = fallbacks;
      if (options.verbose) {
        console.log("Creating XPI");
      }
      return utils.createZip(options);
    })
    .then(function() {
      return utils.createUpdateRDF(options, updateRdfPath);
    })
    .then(function() {
      if (options.verbose) {
        console.log("Created XPI at " + xpiPath);
      }
      return xpiPath;
    });
}
module.exports = xpi;
