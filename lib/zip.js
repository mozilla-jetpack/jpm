var zipdir = require("zip-dir");
var defer = require("when").defer;

/**
 * Takes a directory to zip up and a path to save the
 * zip file on disk. Returns a promise that resolves
 * upon completion.
 *
 * @param {String} dir
 * @param {String} zipPath
 * @return {Promise}
 */

function zip (dir, zipPath) {
  var deferred = defer();

  zipdir(dir, { saveTo: zipPath, filter: filter }, function (err) {
    if (err) deferred.reject(err);
    else deferred.resolve(zipPath);
  });
  return deferred.promise;
}
module.exports = zip;

/**
 * Filter for deciding what is included in a xpi. For now, just ignore
 * zip and other xpis.
 */
function filter (path, stat) {
  return !/\.(zip|xpi)$/.test(path); 
}
