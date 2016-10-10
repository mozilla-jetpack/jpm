/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var getID = require("jetpack-id");
var fs = require("fs");
var path = require("path");
var tmp = require("tmp");
var when = require("when");
var nodefn = require("when/node");
var DecompressZip = require("decompress-zip");
var xml2js = require("xml2js");

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
    console.log.apply(console, [first].concat(messages)); // eslint-disable-line no-console
  }
}

var jpmConsole = {
  info: log.bind(null, "info"),
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
      } catch (e) {} // eslint-disable-line no-empty

      return resolve(manifest);
    }
  });
}
exports.getManifest = getManifest;

function getXpiInfoFromManifest(manifest) {
  return when({
    manifest: manifest,
    id: getID(manifest),
    version: manifest.version,
  });
}
exports.getXpiInfoFromManifest = getXpiInfoFromManifest;

/**
 * Returns a promise that resolves with an info object about an XPI file.
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
      var getInfo;
      var packageFile = path.join(tmpXPI.path, "package.json");
      var installRdfFile = path.join(tmpXPI.path, "install.rdf");

      if (fileExists(packageFile)) {
        getInfo = getXpiInfoFromManifest(require(packageFile));
      } else if (fileExists(installRdfFile)) {
        getInfo = nodefn.call(fs.readFile, installRdfFile)
          .then(function(data) {
            return getXpiInfoFromInstallRdf(data);
          });
      } else {
        getInfo = when.reject(
          new Error("Cannot get info: no manifest found in this XPI"));
      }

      return getInfo
        .catch(function(err) {
          try {
            tmpXPI.remove();
          } catch (e) {} // eslint-disable-line no-empty
          throw err;
        })
        .then(function(info) {
          tmpXPI.remove();
          return info;
        });
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

      var unzipper = new DecompressZip(xpiPath);
      unzipper.on("extract", function(_log) {
        resolve({
          path: tmpPath,
          remove: removeTmpDir,
        });
      });
      unzipper.on("error", cleanUpAndReject);
      unzipper.extract({
        path: tmpPath,
      });
    }, {
      prefix: "tmp-extracted-xpi-",
      // This allows us to remove a non-empty tmp dir.
      unsafeCleanup: true,
    });
  });
}
exports.extractXPI = extractXPI;

function getXpiInfoFromInstallRdf(installRdf) {
  var parser = new xml2js.Parser();
  return nodefn.call(parser.parseString, installRdf)
    .catch(function(parseError) {
      parseError.message = "install.rdf: " + parseError.message;
      throw parseError;
    })
    .then(function(result) {
      var info = {
        manifest: null,
      };
      // RDF is one of those sick and twisted XML variants.
      var root = result.RDF || result["RDF:RDF"];

      if (!root) {
        throw new Error("Could not find root RDF element in install.rdf");
      }
      var descriptions = root.Description || root["RDF:Description"];
      if (!descriptions) {
        throw new Error("Could not find descriptions in install.rdf");
      }

      var foundManifest = false;
      descriptions.forEach(function(obj) {
        var about = obj.$.about || obj.$["RDF:about"];
        if (about !== "urn:mozilla:install-manifest") {
          return;
        }
        foundManifest = true;

        // Check for values in properties first then fall back to attributes.
        // Note that xml2js puts attributes a magical `$`.
        info.id = obj["em:id"] ? obj["em:id"][0] : null;
        if (!info.id) {
          info.id = obj.$["em:id"];
        }
        info.version = obj["em:version"] ? obj["em:version"][0] : null;
        if (!info.version) {
          info.version = obj.$["em:version"];
        }
      });

      if (!foundManifest) {
        throw new Error(
            "Could not find urn:mozilla:install-manifest Description in " +
            "install.rdf");
      }
      if (!info.id) {
        throw new Error("ID was empty in install.rdf");
      }
      if (!info.version) {
        throw new Error("Version was empty in install.rdf");
      }

      return info;
    });
}
exports.getXpiInfoFromInstallRdf = getXpiInfoFromInstallRdf;

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
