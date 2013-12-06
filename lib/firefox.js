var execFile = require("child_process").execFile;
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;

// Need to set based off of OS
var DEFAULT_PATH = "/Applications/Firefox.app/Contents/MacOS/firefox-bin";


function runFirefox (options) {
  options = options || {};

  var binary = normalizeBinary(options.binary || DEFAULT_PATH);
  var profile = options.profile;

  console.log("Running binary " + binary + " with profile at " + profile);

  var proc = execFile(binary, [
    "-profile", profile
  ], function () {});

  return proc;
}
module.exports = runFirefox;
