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
  ], function (err, stdout, stderr) {
    if (options.verbose) {
      stdout.toString().split('\n').forEach(function(line) {
        if (line.length < 3000) {
          // Use process.stdout instead of console so we can print
          // it out during tests
          process.stdout.write(line);
        }
      });
    }
  });

  return proc;
}
module.exports = runFirefox;
