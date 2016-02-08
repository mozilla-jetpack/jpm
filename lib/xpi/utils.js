/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var join = require("path").join;
var when = require("when");
var fs = require("fs-promise");
var Zip = require("jszip");

var RDF = require("../rdf");
var zip = require("../zip");
var console = require("../utils").console;
var getManifest = require("../utils").getManifest;

function getData(xml, tag) {
  tag = xml.getElementsByTagName(tag)[0];

  if (tag) {
    return tag.childNodes[0].data;
  }

  return undefined;
}
exports.getData = getData;

function checkNeedsFallbacks(options) {
  var rdfPath = join(options.addonDir, "install.rdf");
  var bsPath = join(options.addonDir, "bootstrap.js");

  if (!options.useFallbacks) {
    options.needsInstallRDF = false;
    options.needsBootstrapJS = false;

    return when.resolve();
  }

  if (options.useFallbacks && options.verbose) {
    console.log("Checking compatability bootstrap.js and install.rdf for xpi");
  }

  function checkForBootstrap() {
    return fs.exists(bsPath).then(function(exists) {
      if (exists) {
        console.warn("Using existing bootstrap.js. " +
                     "This file is usually auto-generated.");
      }

      options.needsBootstrapJS = !exists;
    });
  }

  return fs.exists(rdfPath).then(function(exists, a2) {
    options.needsInstallRDF = !exists;

    if (exists) {
      console.warn("Using existing install.rdf. " +
                   "This file is usually auto-generated.");

      var needsBootstrap = !options.retro;
      return needsBootstrap ? checkForBootstrap() : null;
    }

    return checkForBootstrap();
  });
}
exports.checkNeedsFallbacks = checkNeedsFallbacks;

// Creates bootstrap.js/install.rdf -- will be removed once
// AOM is updated
function createFallbacks(options) {
  var rdfPath = join(options.addonDir, "install.rdf");
  var bsPath = join(options.addonDir, "bootstrap.js");
  var bootstrapSrc = options.bootstrapSrc;

  if (options.useFallbacks && options.verbose) {
    console.log("Creating fallbacks if they are necessary..");
  }

  return getManifest({
    addonDir: options.addonDir
  }).then(function(manifest) {
    return when.all([
      options.needsInstallRDF ? when.resolve(
        RDF.createRDF(manifest)) : when.resolve(),
      options.needsBootstrapJS ? when.resolve(
        fs.readFile(bootstrapSrc)) : when.resolve(),
    ]).then(function(fallbacks) {
      if (fallbacks) {
        return {
          installRDF: fallbacks[0],
          bootstrapJS: fallbacks[1]
        };
      }
    });
  });
}
exports.createFallbacks = createFallbacks;

function createZip(options) {
  var dir = options.addonDir;

  if (options.verbose) {
    console.log("Zipping up files...");
  }

  return zip(options, dir, options.xpiPath).then(function(result) {
    var fallbacks = options.fallbacks;

    if (!fallbacks || (!fallbacks.installRDF && !fallbacks.bootstrapJS)) {
      // return the zip file if there isn't any needed fallback file
      return result;
    }

    return fs.readFile(options.xpiPath).then(function(data) {
      // add the needed fallbacks files into the zip file
      var zip = new Zip(data);

      if (options.verbose && (fallbacks.installRDF || fallbacks.bootstrapJS)) {
        console.log("Inject bootstrap.js and install.rdf in " +
                    options.xpiPath);
      }

      if (fallbacks.installRDF) {
        zip.file("install.rdf", fallbacks.installRDF);
      }

      if (fallbacks.bootstrapJS) {
        zip.file("bootstrap.js", fallbacks.bootstrapJS);
      }

      var buffer = zip.generate({type: "nodebuffer",
                                 compression: "DEFLATE",
                                 compressionOptions: {level: 6}});

      return fs.writeFile(result, buffer).then(function() {
        return result;
      });
    });
  });
}
exports.createZip = createZip;

function createUpdateRDF(options, updateRdfPath) {
  var deferred = when.defer();

  if (options.verbose) {
    console.log("Creating updateRDF...");
  }
  return getManifest({addonDir: options.addonDir}).then(function(manifest) {
    if (!manifest.updateLink || options.skipUpdateRDF) {
      return;
    }
    if (!/^https/.test(manifest.updateLink)) {
      deferred.reject("UpdateLink must start with 'https': " +
                      manifest.updateLink);
      return deferred.promise;
    }
    return fs.writeFile(
      updateRdfPath, RDF.createUpdateRDF(manifest)).then(function() {
        console.log("updateRDF created at " + updateRdfPath);
        deferred.resolve();
        return deferred.promise;
      });
  });
}
exports.createUpdateRDF = createUpdateRDF;
