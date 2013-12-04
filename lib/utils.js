var path = require("path");
var colors = require("colors");

colors.setTheme({
  verbose: 'cyan',
  log: 'grey',
  info: 'green',
  warning: 'yellow',
  debug: 'blue',
  error: 'red'
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
  console.log.apply(console, ["JPM", type[type]].concat(messages));
}

var jpmConsole = {
  log: log.bind(null, "info"),
  warn: log.bind(null, "warning"),
  error: log.bind(null, "error")
};

exports.console = Object.freeze(jpmConsole);

/**
 * Returns the `package.json` manifest as an object
 * from the `cwd`
 *
 * @return {Object}
 */

function getManifest () {
  var cwd = process.cwd();
  return require(path.join(cwd, "package.json"));
}
exports.getManifest = getManifest;
