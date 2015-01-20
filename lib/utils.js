/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var colors = require("colors");
var os = require("os");
var Winreg = require('winreg');
var when = require("when");
var parse = require("mozilla-toolkit-versioning").parse;
var compare = require("mozilla-version-comparator");
var nodefn = require("when/node");
var which = nodefn.lift(require("which"));

var AOM_SUPPORT_VERSION = require("./settings").AOM_SUPPORT_VERSION;
var APP_NAMES = ["firefox", "beta", "nightly", "aurora"];

colors.setTheme({
  verbose: "cyan",
  log: "grey",
  info: "green",
  warning: "yellow",
  debug: "blue",
  error: "red"
});

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
  var first = "JPM " + type[type] + " " + (messages.shift() + "");

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
 *
 * @return {Object}
 */
function getManifest () {
  return when.promise(function(resolve, reject) {
    var cwd = process.cwd();
    var json = path.join(cwd, "package.json");
    var manifest = {};
    try {
      manifest = require(json);
    }
    catch (e) {}
    return resolve(manifest);
  })
}

exports.getManifest = getManifest;

/**
 * Takes an app name (e.g. `firefox` or `beta`) or a path to a
 * binary file (e.g. `/Applications/FirefoxNightly.app`), and, based
 * on the OS, resolves the absolute path to the corresponding binary
 * file (or its shell-script wrapper). Accepts optional `platform`
 * and `arch` parameters for testing.
 *
 * @param {String} binaryPath
 * @param {String} (platform)
 * @param {String} (arch)
 * @return {Promise}
 */

function normalizeBinary (binaryPath, platform, arch) {
  return when.promise(function (resolve, reject) {
    binaryPath = binaryPath || process.env.JPM_FIREFOX_BINARY || "firefox";
    platform = platform || os.platform();
    arch = arch || os.arch();

    var platformId = /darwin/i.test(platform) ? "osx" :
                     /win/i.test(platform) ? "windows" :
                     /linux/i.test(platform) ? "linux" :
                     platform;
    var archId = /64/.test(arch) ? "(64)" : arch;
    var app = binaryPath.toLowerCase();

    function isAppName (name) {
      return ~APP_NAMES.indexOf(name);
    }

    if (isAppName(app)) {
      binaryPath = normalizeBinary.paths[app + " on " + platformId + archId] ||
                   normalizeBinary.paths[app + " on " + platformId] ||
                   binaryPath;
      app = binaryPath.toLowerCase();
    }

    if (isAppName(app)) {
      if (platformId === "windows") {
        return normalizeWindowsBinary(resolve, reject, archId, app);
      } else { // Linux &c.
        return which(app).then(resolve, reject);
      }
    } else { // binary path e.g. /usr/bin/firefox
      // On OS X, if given the app path, resolve to the actual binary
      if ((platformId === "osx") && (path.extname(binaryPath) === ".app")) {
        binaryPath = path.join(binaryPath, "Contents/MacOS/firefox-bin");
      }
      return resolve(binaryPath);
    }
  });
}

// resolve the binary path on Windows
function normalizeWindowsBinary (resolve, reject, arch, app) {
  var appName = "Mozilla Firefox";
  var win64 = arch === "(64)";

  switch (app) {
    case "beta":
      // the default path in the beta installer is the same as the stable one
      appName = "Mozilla Firefox";
      break;
    case "aurora":
      appName = "Aurora";
      break;
    case "nightly":
      appName = "Nightly";
      break;
    default:
      break;
  }

  // this is used when reading the registry goes wrong.
  function fallBack () {
    var programFilesVar = "ProgramFiles";
    if (win64) {
      programFilesVar = "ProgramFiles(x86)";
    }
    resolve(path.join(process.env[programFilesVar], appName, "firefox.exe"));
  }

  var rootKey = '\\Software\\Mozilla\\';

  if (win64) {
    rootKey = '\\Software\\Wow6432Node\\Mozilla';
  }

  rootKey = path.join(rootKey, appName);

  return when.promise(function (resolve, reject) {
    var versionKey = new Winreg({
      hive: Winreg.HKLM,
      key: rootKey
    });
    versionKey.get("CurrentVersion", function (err, key) {
      return (err) ? reject() : resolve(key.value);
    });
  }).then(function (version) {
    var mainKey = new Winreg({
      hive: Winreg.HKLM,
      key: path.join(rootKey, version, "Main")
    });
    mainKey.get("PathToExe", function (err, key) {
      if (err) {
        fallBack();
        return;
      }
      resolve(key.value);
    });
  }, fallBack);
}

normalizeBinary.paths = {
  "firefox on osx": "/Applications/Firefox.app/Contents/MacOS/firefox-bin",
  "beta on osx":    "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin",
  "aurora on osx":  "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin",
  "nightly on osx": "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin"
};

exports.normalizeBinary = normalizeBinary;
