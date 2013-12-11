
var xpi = require("./xpi");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var tmp = require('./tmp');
var join = require("path").join;
var _ = require("underscore");
var defer = require("when").defer;
var fs = require("fs-promise");

function test (manifest, options) {
  var cwd = process.cwd();
    var testOptionsFile = join(cwd, "jetpack-test-options.json");
    var testOptions = {
      modules: [ 'test/test-main' ],
      resultsFile: undefined
    };

    // Generate TEMP results file
    return tmp.createTmpFile({
      prefix: "jpm-results-file-"
    }).then(function( resultsFilePath ) {
      // Generate XPI and get the path
      console.log("Creating the " + testOptionsFile + " file");
      console.log("results file: " + resultsFilePath);

      testOptions.resultsFile = resultsFilePath;

      return fs.writeFile(testOptionsFile, JSON.stringify(testOptions));
    }).then(function() {
      // Generate XPI and get the path
      console.log("creating the xpi");
      return xpi(manifest, _.extend({}, options));
    }).then(function (xpiPath) {
      // Create a profile so we can instantiate an instance
      // of Firefox using the profile with the add-on installed
      console.log("creating the profile");
      return createProfile({
        xpi: xpiPath
      });
    }).then(function (profilePath) {
      console.log("Running Firefox");

      fs.remove(testOptionsFile);

      return runFirefox({
        profile: profilePath,
        binary: options.binary,
        verbose: options.verbose
      });
    }).then(function (proc) {

    }, function(e) { throw e });
}
module.exports = test;
