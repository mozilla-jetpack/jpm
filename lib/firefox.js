var execFile = require("child_process").execFile;
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;

function runFirefox (options) {
  options = options || {};

  var binary = normalizeBinary(options.binary);
  var profile = options.profile;

  console.log("Running binary " + binary + " with profile at " + profile);

  var proc = execFile(binary, [
    "-profile", profile
  ], function () {});

  return proc;
}
module.exports = runFirefox;
