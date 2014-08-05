var path = require("path");
var colors = require("colors");
var os = require("os");
var Winreg = require('winreg');
var defer = require("when").defer;
var parse = require("mozilla-toolkit-versioning").parse;
var compare = require("mozilla-version-comparator");
var AOM_SUPPORT_VERSION = require("./settings").AOM_SUPPORT_VERSION;

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
  var cwd = process.cwd();
  try {
    return require(path.join(cwd, "package.json"));
  } catch (e) {
    return null;
  }
}
exports.getManifest = getManifest;

/**
 * Takes a path to a binary file (like `/Applications/FirefoxNightly.app`)
 * and based on OS, resolves to the actual binary file. Accepts an optional
 * `platform` and `arch` parameter for testing.
 *
 * @param {String} binaryPath
 * @param {String} (platform)
 * @param {String} (arch)
 * @return {Promise}
 */

function normalizeBinary (binaryPath, platform, arch) {
  var getPath = defer();
  platform = platform || os.platform();
  arch = arch || os.arch();
  binaryPath = binaryPath || process.env.JPM_FIREFOX_BINARY || "firefox";

  arch = /64/.test(arch) ? "(64)" : "";
  platform = /darwin/i.test(platform) ? "osx" :
             /win/i.test(platform) ? "windows" + arch :
             /linux/i.test(platform) ? "linux" + arch :
             platform;

  var app = binaryPath.toLowerCase();
  binaryPath = normalizeBinary.paths[app + " on " + platform] ||
               normalizeBinary.paths[app + " on " + platform + arch] ||
               binaryPath;

  var isAppPath = platform === "osx" && path.extname(binaryPath) === ".app";

  // On OSX, if given the app path, resolve to the actual binary
  binaryPath = isAppPath ? path.join(binaryPath, "Contents/MacOS/firefox-bin") :
               binaryPath;
  var channelNames = ["firefox", "beta", "nightly", "aurora"];
  // not Windows or binary path given
  if (platform.indexOf("windows") === -1 || channelNames.indexOf(app) === -1) {
    getPath.resolve(binaryPath);
    return getPath.promise;
  }
  // Windows binary finding
  var appName = "Mozilla Firefox";
  switch(app) {
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
    if (arch === "(64)") {
      programFilesVar = "ProgramFiles(x86)";
    }
    getPath.resolve(path.join(process.env[programFilesVar], appName, "firefox.exe"));
  }

  var rootKey = '\\Software\\Mozilla\\';
  if (arch === "(64)") {
    rootKey = '\\Software\\Wow6432Node\\Mozilla';
  }
  rootKey = path.join(rootKey, appName);
  var versionKey = new Winreg({
    hive: Winreg.HKLM,
    key: rootKey
  });
  var findVersion = defer();
  versionKey.get("CurrentVersion", function(err, key) {
    if(err) {
      findVersion.reject();
      return;
    }
    findVersion.resolve(key.value);
  });
  findVersion.promise.then(function(version) {
    var mainKey = new Winreg({
      hive: Winreg.HKLM,
      key: path.join(rootKey, version, "Main")
    });
    mainKey.get("PathToExe", function(err, key) {
      if (err) {
        fallBack();
        return;
      }
      getPath.resolve(key.value);
    });
  }, fallBack);
  return getPath.promise;
}
normalizeBinary.paths = {
  "firefox on osx": "/Applications/Firefox.app/Contents/MacOS/firefox-bin",
  "beta on osx": "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin",
  "aurora on osx": "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin",
  "nightly on osx": "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin",

  "firefox on linux": "/usr/lib/firefox",
  "beta on linux": "/usr/lib/firefox-beta",
  "aurora on linux": "/usr/lib/firefox-aurora",
  "nightly on linux": "/usr/lib/firefox-nightly",

  "firefox on linux(64)": "/usr/lib64/firefox",
  "beta on linux(64)": "/usr/lib64/firefox-beta",
  "aurora on linux(64)": "/usr/lib64/firefox-aurora",
  "nightly on linux(64)" : "/usr/lib64/firefox-nightly"
};
exports.normalizeBinary = normalizeBinary;
