var path = require("path");
var zipdir = require("zip-dir");
var defer = require("when").defer;
var console = require("./utils").console;

/**
 * Takes a directory to zip up and a path to save the
 * zip file on disk. Returns a promise that resolves
 * upon completion.
 *
 * @param {String} dir
 * @param {String} zipPath
 * @return {Promise}
 */

function zip (options, dir, zipPath) {
  var deferred = defer();

  zipdir(dir, { saveTo: zipPath, each: each, filter: filter }, function (err) {
    if (err) deferred.reject(err);
    else deferred.resolve(zipPath);
  });

  function each (filepath) {
    if (options.verbose) {
      console.log("Adding: " + filepath);
    }
  }
  return deferred.promise;
}
module.exports = zip;

/**
 * Filter for deciding what is included in a xpi. For now, just ignore
 * zip and other xpis.
 */
function filter (filepath, stat) {
  var base = path.basename(filepath);
  return !/\.(zip|xpi)$/.test(filepath)               // ignore zip/xpi files
      && !(/^tests?$/.test(base) && stat.isDirectory()) // ignore test directory
      && !/^\./.test(base);                           // ignore hidden files
}
