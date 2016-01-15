/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var getID = require("jetpack-id");
var fs = require("fs");
var path = require("path");
var tmp = require("tmp");
var os = require("os");
var when = require("when");
var unzip = require("unzip");
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

function hasAOMSupport(manifest) {
  // If no engines specified, assume no AOM support
  if (!manifest.engines) {
    return false;
  }
  var engines = Object.keys(manifest.engines);
  var supported = true;

  // If engines field exists, but no engines specified, assume no AOM support
  if (!engines.length) {
    return false;
  }

  Object.keys(manifest.engines).forEach(function(engine) {
    var parsed = parse(manifest.engines[engine]);
    // If no minimum engine support specified, unsupported
    if (!parsed.min) {
      supported = false;
      return;
    }

    // If minimum engine support is less than AOM support, unsupported
    if (compare(parsed.min, AOM_SUPPORT_VERSION) === -1) {
      supported = false;
    }
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
function log(type) {
  var messages = Array.prototype.slice.call(arguments);
  messages.shift();
  // Concatenate default strings and first message argument into
  // one string so we can use `printf`-like replacement
  var first = "JPM [" + type + "] " + (messages.shift() + "");

  if (process.env.NODE_ENV !== "test") {
    console.log.apply(console, [first].concat(messages));
  }
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
 *        - `addonDir` directory of the add-on source code, defaulting
 *          to the working directory.
 *        - `xpiPath` a path to an XPI file where the manifest resides.
 *          Without this, the current working directory is assumed.
 * @return {Promise} resolves to a manifest object
 */
function getManifest(options) {
  options = _.assign({
    addonDir: process.cwd(),
    xpiPath: null
  }, options);
  return when.promise(function(resolve, reject) {
    if (options.xpiPath) {
      return getXpiInfo(options.xpiPath)
        .then(function(xpiInfo) {
          resolve(xpiInfo.manifest);
        })
        .catch(reject);
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

function getXpiInfoFromManifest(manifest) {
  return {
    manifest: manifest,
    id: getID(manifest),
    version: manifest.version,
  };
}
exports.getXpiInfoFromManifest = getXpiInfoFromManifest;

/**
 * Returns an info object about an XPI file.
 *
 * @param {String} xpiPath - path to the XPI file
 * @return {Object} xpiInfo
 *   - manifest: manifest object, which might be empty.
 *   - id: GUID of the XPI.
 *   - version: version string for the XPI.
 */
function getXpiInfo(xpiPath) {
  return extractXPI(xpiPath)
    .then(function(tmpXPI) {
      var manifest = {};
      try {
        manifest = require(path.join(tmpXPI.path, "package.json"));
      } catch (e) {}

      tmpXPI.remove();

      // TODO: when there's no manifest, parse install.rdf to get info.

      return getXpiInfoFromManifest(manifest);
    });
}
exports.getXpiInfo = getXpiInfo;

/**
 * Takes an `xpiPath` (e.g. filename.xpi), extracts it, and resolves
 * the returned promise with an object to let you work with the
 * temporary directory.
 *
 * The resolution object has the following attributes:
 * - `path`: temporary directory path containing the XPI contents.
 * - `remove()`: method that removes the temporary directory. You must
 *   call this explicitly when you are finished.
 *
 * @param {Object} tmpXPI
 * @return {Promise}
 */
function extractXPI(xpiPath) {
  return when.promise(function(resolve, reject) {
    if (!xpiPath) {
      reject(new Error("xpiPath cannot be empty"));
    }
    var stat = fs.statSync(xpiPath);
    if (!stat.isFile()) {
      reject(new Error("expected an XPI file, got: " + xpiPath));
    }
    tmp.dir(function(err, tmpPath, removeTmpDir) {
      function cleanUpAndReject(err) {
        removeTmpDir();
        reject(err);
      }
      if (err) {
        return cleanUpAndReject(err);
      }
      fs.createReadStream(xpiPath)
        .on("error", cleanUpAndReject)
        .pipe(unzip.Extract({path: tmpPath}))
        .on("error", cleanUpAndReject)
        .on("close", function() {
          resolve({
            path: tmpPath,
            remove: removeTmpDir,
          });
        });
    }, {
      prefix: "tmp-extracted-xpi-",
      // This allows us to remove a non-empty tmp dir.
      unsafeCleanup: true,
    });
  });
}
exports.extractXPI = extractXPI;
