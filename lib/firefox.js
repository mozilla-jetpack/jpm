/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var defer = require("when").defer;
var extend = require("lodash").extend;
var profile = require("./profile");
var console = require("./utils").console;
var fxRunner = require("fx-runner/lib/run");
var getID = require("jetpack-id");
var TEST_RESULTS_REGEX = /(\d+) of (\d+) tests passed/i
var isTest = process.env.NODE_ENV === "test";
var GARBAGE = [
  /\[JavaScript Warning: "TypeError: "[\w\d]+" is read-only"\]/,
  /JavaScript strict warning: /,
  /\#\#\#\!\!\! \[Child\]\[DispatchAsyncMessage\]/,
  /JavaScript strict warning: resource:\/\/\/modules\/sessionstore\/SessionStore\.jsm/,
  /JavaScript strict warning: resource:\/\/gre\/components\/nsSearchService\.js/
];

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
  options = options || {};
  var runDeferred = defer();
  var binary = null;
  var code = 0;
  var profilePath = options.profile;

  return fxRunner({
    "binary": options.binary,
    "no-remote": true,
    "foreground": true,
    "profile": profilePath,
    env: extend({}, process.env, require("./firefox-env.json")),
    verbose: options.verbose,
    "binary-args": options.binaryArgs
  }).then(function(results) {
    var firefox = results.process;

    if (options.verbose)  {
      console.log("Executing Firefox binary: " + results.binary);
      console.log("Executing Firefox with args: " + results.args);
    }

    firefox.on("error", function (err) {
      if (/No such file/.test(err) || err.code === "ENOENT") {
        console.error("No Firefox binary found at " + binary);
        if (!options.binary) {
          console.error("Specify a Firefox binary to use with the `-b` flag.");
        }
      }
      else {
        console.error(err);
      }
      runDeferred.reject(err);
    });

    firefox.on("close", function () {
      runDeferred.resolve({ code: code });
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
      if (isErrorString(data)) {
        writeError(data);
      }
      else {
        writeLog(data);
      }

      if (TEST_RESULTS_REGEX.test(data)) {
        if (RegExp.$1 === RegExp.$2) {
          code = 0;
          writeLog("All tests passed!\n");
        }
        else {
          code = 1;
          writeLog("There were test failures...\n");
        }
      }
    });

    return runDeferred.promise;
  });
}
module.exports = runFirefox;

function isGarbage(data) {
  return GARBAGE.map(function(filter) {
            return filter.test(data);
          }).reduce(function(result, test) {
            return result || test;
          }, false);
}

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
  if (isGarbage(s)) return;
  isTest ? process.stderr.write(s) : console.error(s);
}

function writeLog (s) {
  if (isGarbage(s)) return;
  process.stdout.write(s);
}

function writeWarn (s) {
  if (isGarbage(s)) return;
  isTest ? process.stdout.write(s) : console.warn(s);
}
