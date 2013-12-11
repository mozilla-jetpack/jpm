var execFile = require("child_process").execFile;
var console = require("./utils").console;
// Need to set based off of OS
var DEFAULT_PATH = "/Applications/Firefox.app/Contents/MacOS/firefox-bin";

function runFirefox (options) {
  options = options || {};

  var binary = options.binary || DEFAULT_PATH;
  var profile = options.profile;

  console.log("Running binary " + binary + " with profile at " + profile);

  var proc = execFile(binary, [
    "-profile", profile
  ], function (err, stdout, stderr) {
    if (options.verbose) {
      stdout.toString().split('\n').forEach(function(line) {
        if (line.length < 3000) {
          console.log(line);
        }
      });
    }
  });

  return proc;
}
module.exports = runFirefox;
