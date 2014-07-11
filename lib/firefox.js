var execFile = require("child_process").execFile;
var defer = require("when").defer;
var createProfile = require("./profile");
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;
var getID = require("jetpack-id");

var TEST_RESULTS_REGEX = /\d+ of \d+ tests passed/i

/**
 * Takes a manifest object (from package.json) and options,
 * and runs Firefox.
 *
 * @param {Object} manifest
 * @param {Object} options
 *   - `binary` path to Firefox binary to use
 *   - `profile` path to profile or profile name to use
 *   - `binaryArgs` binary arguments to pass into Firefox, split up by spaces
 *   - `verbose` whether or not Firefox should print all of stdout
 * @return {Promise}
 */

function runFirefox (manifest, options) {
  var profileDeferred = defer();
  var runDeferred = defer();
  options = options || {};
  var binary = normalizeBinary(options.binary);
  var args = [];

  // Create profile if none passed in
  if (!options.profile) {
    createProfile(options).then(profileDeferred.resolve);
  }
  else {
    profileDeferred.resolve(options.profile);
  }

  return profileDeferred.promise.then(function (profile) {
    // Firefox takes -P if given a profile name and
    // -profile if given a path (starting with "/" or "./").
    if (/^\.?\//.test(profile))
      args = args.concat(['-profile', profile]);
    else
      args = args.concat(['-P', profile]);

    if (options.binaryArgs)
      args = args.concat(options.binaryArgs.split(" "));

    // Use `process.std[out|err].write` to write to screen
    // instead of console.log since console.logs are silenced during testing
    var task = execFile(binary, args, null, function(err, stdout, stderr) {
      if (options.verbose) {
        if (err) {
          process.stdout.write('err: ' + err + '\n');
        }
        process.stderr.write(stderr);
      }

      runDeferred.resolve(task);
    });

    task.stdout.on('data', function(data) {
      var write = false;

      if (options.verbose ||
          TEST_RESULTS_REGEX.test(data) ||
          logFromAddon(manifest, data)) {
        write = true;
      }

      if (write) {
        process.stdout.write(data);
      }
    });

    return runDeferred.promise;
  });
}
module.exports = runFirefox;

function logFromAddon (manifest, line) {
  // Use `manifest.name` instead of ID, since that's what the SDK uses to log
  return (new RegExp("^console\\.[a-z]+: " + manifest.name + ":")).test(line);
  
}
