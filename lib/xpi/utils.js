/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var join = require("path").join;
var when = require("when");
var fs = require("fs-promise");
var createRDF = require("../rdf");
var zip = require("../zip");
var console = require("../utils").console;
var getManifest = require("../utils").getManifest;

function getData (xml, tag) {
  var tag = xml.getElementsByTagName(tag)[0];

  if (tag) {
    return tag.childNodes[0].data;
  }

  return undefined;
}
exports.getData = getData;

function checkNeedsFallbacks(options) {
  var dir = process.cwd();
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");

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
        console.warn("Using existing bootstrap.js. This file is usually auto-generated.");
      }

      options.needsBootstrapJS = !exists;
    });
  }

  return fs.exists(rdfPath).then(function(exists, a2) {
    options.needsInstallRDF = !exists;

    if (exists) {
      console.warn("Using existing install.rdf. This file is usually auto-generated.");

      var needsBootstrap = !options.retro;
      return needsBootstrap ? checkForBootstrap() : null;
    }

    return checkForBootstrap();
  });
}
exports.checkNeedsFallbacks = checkNeedsFallbacks;

// Creates bootstrap.js/install.rdf -- will be removed once
// AOM is updated
function createFallbacks (options) {
  var dir = process.cwd();
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");
  var bootstrapSrc = options.bootstrapSrc;

  if (options.useFallbacks && options.verbose) {
    console.log("Creating fallbacks if they are necessary..");
  }

  return getManifest().then(function(manifest) {
    return when.all([
      options.needsInstallRDF ? fs.writeFile(rdfPath, createRDF(manifest)) : when.resolve(),
      options.needsBootstrapJS ? fs.copy(bootstrapSrc, bsPath) : when.resolve(),
    ])
  });
}
exports.createFallbacks = createFallbacks;

function removeFallbacks (options) {
  var dir = process.cwd();
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");

  if (options.useFallbacks && options.verbose) {
    console.log("Removing fallbacks if they were necessary..");
  }

  return when.all([
    options.needsInstallRDF ? fs.remove(rdfPath) : when.resolve(),
    options.needsBootstrapJS ? fs.remove(bsPath) : when.resolve()
  ]);
}
exports.removeFallbacks = removeFallbacks;

function createZip (options) {
  var start = Date.now();
  var dir = process.cwd();

  if (options.verbose) {
    console.log("Creating XPI...");
  }

  return zip(options, dir, options.xpiPath).then(function (result) {
    var diff = Date.now() - start;
    console.log("XPI created at " + options.xpiPath + " (" + diff + "ms)");
    return result;
  });
}
exports.createZip = createZip;
