
var join = require("path").join;
var when = require("when");
var fs = require("fs-promise");
var createRDF = require("../rdf");
var zip = require("../zip");
var console = require("../utils").console;
var getManifest = require("../utils").getManifest;

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

  return when.all([
    fs.exists(rdfPath).then(function(exists, a2) {
      if (exists) {
        console.warn("Using existing install.rdf. This file is usually auto-generated.");
      }

      options.needsInstallRDF = !exists;
    }),
    fs.exists(bsPath).then(function(exists) {
      if (exists) {
        console.warn("Using existing bootstrap.js. This file is usually auto-generated.");
      }

      options.needsBootstrapJS = !exists;
    })
  ]);
}
exports.checkNeedsFallbacks = checkNeedsFallbacks;

// Creates bootstrap.js/install.rdf -- will be removed once
// AOM is updated
function createFallbacks (options) {
  var dir = process.cwd();
  var rdfPath = join(dir, "install.rdf");
  var bsPath = join(dir, "bootstrap.js");
  var bootstrapSrc = options.bootstrapSrc;
  var manifest = getManifest() || {};

  if (options.useFallbacks && options.verbose) {
    console.log("Creating fallbacks if they are necessary..");
  }

  return when.all([
    options.needsInstallRDF ? fs.writeFile(rdfPath, createRDF(manifest)) : when.resolve(),
    options.needsBootstrapJS ? fs.copy(bootstrapSrc, bsPath) : when.resolve(),
  ]);
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
