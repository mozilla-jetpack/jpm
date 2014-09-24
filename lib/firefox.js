var spawn = require("child_process").spawn;
var defer = require("when").defer;
var extend = require("underscore").extend;
var createProfile = require("./profile");
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;
var getID = require("jetpack-id");
var TEST_RESULTS_REGEX = /(\d+) of (\d+) tests passed/i
var isTest = process.env.NODE_ENV === "test";

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
  var binary = null;
  var args = ["-no-remote"];

  // Create profile if none passed in
  if (!options.profile) {
    createProfile(options).then(profileDeferred.resolve);
  }
  else {
    profileDeferred.resolve(options.profile);
  }

  function handleProfile (profile) {
    // Firefox takes -P if given a profile name and
    // -profile if given a path (starting with "/" or "./").
    if (!/[\\\/]/.test(profile))
      args = args.concat(["-P", profile]);
    else
      args = args.concat(["-profile", profile]);

    if (options.binaryArgs)
      args = args.concat(options.binaryArgs.split(" "));

    if (options.verbose)  {
      console.log("Executing Firefox binary: " + binary);
      console.log("Executing Firefox with args: " + args);
    }

    var env = extend({}, process.env, {
      "XPCOM_DEBUG_BREAK": "stack",
      "NS_TRACE_MALLOC_DISABLE_STACKS": "1"
    });

    // Use `process.std[out|err].write` to write to screen
    // instead of console.log during testing with the helpers below.
    //
    // Using `spawn` so we can stream logging as they come in, rather than buffer them up
    // until the end, which can easily hit the max buffer size.
    var firefox = spawn(binary, args, { env: env });

    firefox.on("error", function (err) {
      if (/No such file/.test(err) || err.code === "ENOENT") {
        console.error("No Firefox binary found at " + binary);
        if (!options.binary) {
          console.error("Specify a Firefox binary to use with the `-b` flag.");
        }
      } else {
        console.error(err);
      }
      runDeferred.reject(err);
    });

    firefox.on("close", function () {
      process.removeListener("exit", killFirefox);
      runDeferred.resolve(firefox);
    });

    firefox.stderr.on("data", function (data) {
      // Only print out annoying warnings if verbose is on
      if (/^\s*System JS : WARNING/.test(data) && options.verbose) {
        writeWarn(data);
      }
      // Otherwise if verbose is on, and we find something, probably a serious error.
      else if (options.verbose) {
        writeError(data);
      }
    });

    // Many errors in addons are printed to stdout instead of stderr;
    // we should check for errors here and print them out regardless of
    // verbose status
    firefox.stdout.on("data", function (data) {
      var write = false;

      if (options.verbose ||                    // Print everything in verbose
          TEST_RESULTS_REGEX.test(data) ||      // Print test results always
          logFromAddon(manifest, data)) {       // Print any logs from addon always
        write = true;
      }

      if (isErrorString(data)) {
        writeError(data);
      } else if (write) {
        writeLog(data);
      }

      if (TEST_RESULTS_REGEX.test(data) && RegExp.$1 === RegExp.$2) {
        writeLog("All tests passed!");
      }
    });

    function killFirefox () {
      firefox.kill();
    }

    // Kill child process when main process is killed
    process.once("exit", killFirefox);
    return runDeferred.promise;
  }

  return normalizeBinary(options.binary).then(function(path) {
    binary = path;
    return profileDeferred.promise;
  }).then(handleProfile);
}
module.exports = runFirefox;

function logFromAddon (manifest, line) {
  // Use `manifest.name` instead of ID, since that's what the SDK uses to log
  return (new RegExp("^console\\.[a-z]+: " + manifest.name + ":")).test(line);
}

function isErrorString (line) {
  if (/^\*{25}/.test(line))
    return true;
  if (/^\s*Message: [\D]*Error/.test(line))
    return true;
  return false;
}

function writeError (s) {
  isTest ? process.stderr.write(s) : console.error(s);
}

function writeLog (s) {
  isTest ? process.stdout.write(s) : console.log(s);
}

function writeWarn (s) {
  isTest ? process.stdout.write(s) : console.warn(s);
}
