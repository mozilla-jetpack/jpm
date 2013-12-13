var path = require("path");
var fs = require("fs");
var colors = require("colors");
var os = require("os");

colors.setTheme({
  verbose: "cyan",
  log: "grey",
  info: "green",
  warning: "yellow",
  debug: "blue",
  error: "red"
});

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
  console.log.apply(console, [first].concat(messages));
}

var jpmConsole = {
  log: log.bind(null, "info"),
  warn: log.bind(null, "warning"),
  error: log.bind(null, "error")
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
 * @return {String}
 */

function normalizeBinary (binaryPath, platform, arch) {
  platform = platform || os.platform();
  arch = arch || os.arch();
  // Set default based on OS
  if (!binaryPath) {
    if (/darwin/i.test(platform))
      binaryPath = "/Applications/Firefox.app/Contents/MacOS/firefox-bin";
    else if (/win/i.test(platform)) {
      if (/64/.test(arch))
        binaryPath = "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe";
      else
        binaryPath = "C:\\Program Files\\Mozilla Firefox\\firefox.exe";
    }
    else if (/linux/i.test(platform)) {
      // TODO path should find latest firefox installed i.e.
      // "/usr/lib/firefox-26.0.1a"
      if (/64/.test(arch))
        binaryPath = "/usr/lib64/firefox";
      else
        binaryPath = "/usr/lib/firefox";
    }
  }

  // On OSX, if given the app path, resolve to the actual binary
  if (/darwin/i.test(platform) && /\.app$/.test(binaryPath)) {
    return path.join(binaryPath, "Contents/MacOS/firefox-bin");
  }

  return binaryPath;
}
exports.normalizeBinary = normalizeBinary;
