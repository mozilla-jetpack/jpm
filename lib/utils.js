/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var tmp = require("tmp");
var os = require("os");
var when = require("when");
var unzip = require("unzip2");
var parse = require("mozilla-toolkit-versioning").parse;
var compare = require("mozilla-version-comparator");
var AOM_SUPPORT_VERSION = require("./settings").AOM_SUPPORT_VERSION;

/**
 * Takes a `manifest` object and determines whether or not
 * AOM is supported by all platforms that the addon supports.
 *
 * @param {Object} manifest
 * @return {Boolean}
 */

function hasAOMSupport (manifest) {
  // If no engines specified, assume no AOM support
  if (!manifest.engines) return false;
  var engines = Object.keys(manifest.engines);
  var supported = true;

  // If engines field exists, but no engines specified, assume no AOM support
  if (!engines.length) return false;

  Object.keys(manifest.engines).forEach(function (engine) {
    var parsed = parse(manifest.engines[engine]);
    // If no minimum engine support specified, unsupported
    if (!parsed.min) {
      supported = false;
      return;
    }

    // If minimum engine support is less than AOM support, unsupported
    if (compare(parsed.min, AOM_SUPPORT_VERSION) === -1)
      supported = false;
  });
  return supported;
}
exports.hasAOMSupport = hasAOMSupport;

/**
 * Exports a `console` object that has several methods
 * similar to a traditional console like `log`, `warn`, `error`,
 * and `verbose`, which feed through a simple logging messenger.
 *
 * @param {String} type
 * @param {String} messages...
 */

function log (type) {
  var messages = Array.prototype.slice.call(arguments);
  messages.shift();
  // Concatenate default strings and first message argument into
  // one string so we can use `printf`-like replacement
  var first = "JPM [" + type + "] " + (messages.shift() + "");

  if (process.env.NODE_ENV !== "test")
    console.log.apply(console, [first].concat(messages));
}

var jpmConsole = {
  log: log.bind(null, "info"),
  warn: log.bind(null, "warning"),
  error: log.bind(null, "error"),
  debug: log.bind(null, "debug")
};

exports.console = Object.freeze(jpmConsole);

/**
 * Returns the `package.json` manifest as an object
 * from the `cwd`, or `null` if not found.
 * If you pass in an optional XPI filename, the manifest will be returned
 * from this directory after a temporary XPI extraction.
 *
 * @param {Object} options
 *        - `xpiPath` a path to an XPI file where the manifest resides.
 *          Without this, the current working directory is assumed.
 * @return {Promise} resolves to a manifest object
 */
function getManifest(options) {
  options = _.assign({
    addonDir: null,
    xpiPath: null
  }, options);
  return when.promise(function(resolve, reject) {
    if (options.xpiPath) {
      return resolve(getXPIManifest(options.xpiPath));
    } else {
      var json = path.join(options.addonDir, "package.json");
      var manifest = {};
      try {
        manifest = require(json);
      } catch (e) {}
      return resolve(manifest);
    }
  });
}
exports.getManifest = getManifest;


function getXPIManifest(xpiPath) {
  return when.promise(function(resolve, reject) {
    tmp.dir(function(err, tmpPath, removeTmpDir) {
      function cleanUpAndReject(err) {
        removeTmpDir();
        reject(err);
      }
      if (err) {
        return cleanUpAndReject(err);
      }
      fs.createReadStream(xpiPath)
        .on('error', cleanUpAndReject)
        .pipe(unzip.Extract({path: tmpPath}))
        .on('error', cleanUpAndReject)
        .on('close', function() {
          resolve({
            path: tmpPath,
            remove: removeTmpDir,
          });
        });

    }, {
      // This allows us to remove a non-empty tmp dir.
      unsafeCleanup: true,
    });
  })
  .then(function(tmpDir) {
    var manifest = {};
    try {
      manifest = require(path.join(tmpDir.path, "package.json"));
    } catch(e) {}
    tmpDir.remove();

    return manifest;
  });
}
