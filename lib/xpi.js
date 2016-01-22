/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var join = require("path").join;
var getID = require("jetpack-id");
var validate = require("./validate");
var hasAOMSupport = require("./utils").hasAOMSupport;
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
 *   - `xpiPath` Path where xpi should be saved. Used by `run`, `test` to indicate
 *               that the xpi saved in a temp directory.
 * @return {Promise}
 */

function xpi(manifest, options) {
  options = options || {};
  var addonDir = options.addonDir || process.cwd();
  var xpiVersion = manifest.version ? ("-" + manifest.version) : "";
  var xpiName = getID(manifest) + xpiVersion + ".xpi";
  var updateRdfName = getID(manifest) + xpiVersion + ".update.rdf";
  var xpiPath = join(options.xpiPath || addonDir, xpiName);
  var updateRdfPath = join(options.xpiPath || addonDir, updateRdfName);
  var useFallbacks = !(options.forceAOM || hasAOMSupport(manifest));

  options = _.merge(options, {
    addonDir: addonDir,
    xpiName: xpiName,
    xpiPath: xpiPath,
    useFallbacks: useFallbacks,
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
