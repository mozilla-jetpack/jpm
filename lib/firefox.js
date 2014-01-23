var execFile = require("child_process").execFile;
var defer = require("when").defer;
var createProfile = require("./profile");
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;

function runFirefox (options) {
  var profileDeferred = defer();
  options = options || {};
  var binary = normalizeBinary(options.binary);
  var args = [];

  // Create profile if none passed in
  if (!options.profile) {
    createProfile(options).then(profileDeferred.resolve);
  } else {
    profileDeferred.resolve(options.profile);
  }

  profileDeferred.promise.then(function (profile) {
    // Firefox takes -P if given a profile name and
    // -profile if given a path (starting with "/" or "./").
    if (/^\.?\//.test(profile))
      args = args.concat(['-profile', profile]);
    else
      args = args.concat(['-P', profile]);

    if (options.binaryArgs)
      args = args.concat(options.binaryArgs.split(" "));

    console.log("Running binary " + binary + " with profile at " + profile);

    var proc = execFile(binary, args, function (err, stdout, stderr) {
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
  });
}
module.exports = runFirefox;
