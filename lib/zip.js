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

  console.log('zipping', dir, zipPath);
  zipdir(dir, zipPath, function (err) {
    console.error(dir, zipPath, err);
    if (err) deferred.reject(err);
    else deferred.resolve(zipPath);
  });
  return deferred.promise;
}
module.exports = zip;
