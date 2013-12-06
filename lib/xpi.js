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
  var configPath = join(cwd, "config.json");
  var sdkPath = join(cwd, "addon-sdk/lib/");
  var existingRDF = false;
  var existingBS = false;
  var existingConfig = false;
  var xpiName = (manifest.name || "jetpack") + ".xpi";
  var xpiPath = join(cwd, xpiName);
  var buildOptions = createBuildOptions(options);

  return all([
    fs.exists(rdfPath),
    fs.exists(bootstrapPath),
    fs.exists(configPath)
  ]).then(function (exists) {
    existingRDF = exists[0];
    existingBS = exists[1];
    existingConfig = exists[2];

    // Copy over default `bootstrap.js` and sdk modules (if overloaded),
    // and write `install.rdf` and `config.json` if they do not
    // already exist
    return writeFiles();
  }).then(function () {
    // Zip up all directory into XPI
    return zip(cwd, xpiPath);
  }).then(function () {
    // Clean up bootstrap/install.rdf/config.json/SDK modules if copied in
    return cleanUp();
  }).then(function () {
    return xpiPath;
  });

  // Writes bootstrap/install.rdf/config.json files if they do not
  // exist already
  function writeFiles () {
    var tasks = [];
    if (!existingRDF)
      tasks.push(fs.writeFile(rdfPath, createRDF(manifest)));
    if (!existingBS)
      tasks.push(fs.copy(bootstrapSrc, bootstrapPath));
    if (!existingConfig)
      tasks.push(fs.writeFile(configPath, JSON.stringify(buildOptions)));

    // If modules are being overloaded, copy the SDK into the directory
    if (options.overload)
      tasks.push(fs.copy(join(options.jetpackRoot, 'lib/'), sdkPath));

    return all(tasks);
  }

  // Removes created bootstrap/install.rdf/config.json files
  // if they did not exist before
  function cleanUp () {
    var tasks = [];
    if (!existingRDF)
      tasks.push(fs.remove(rdfPath));
    if (!existingBS)
      tasks.push(fs.remove(bootstrapPath));
    if (!existingConfig)
      tasks.push(fs.remove(configPath));
    if (options.overload)
      tasks.push(fs.remove(sdkPath));
    return all(tasks);

  }
}
module.exports = xpi;

/**
 * Creates an options object to be written as `config.json`
 * from the jpm parameters in a similar format to how
 * cfx handles the `harness-options.json`
 *
 * @param {Object} options
 * @return {Object}
 */

function createBuildOptions (options) {
  var newOptions = {};

  if (options.overload) {
    newOptions["force-use-bundled-sdk"] = true;
    newOptions["is-sdk-bundled"] = true;
  }

  return newOptions;
}
