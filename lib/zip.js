/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var zipdir = require("zip-dir");
var when = require("when");
var console = require("./utils").console;
var ignore = require("./ignore");

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
  return when(ignore(dir, options))
  .then(function (includes) {
    var deferred = when.defer();

    zipdir(dir, {
      saveTo: zipPath,
      each: each.bind(null, options),
      filter: filter.bind(null, options, includes, dir)
    }, function (err, buffer) {
      if (err)
        deferred.reject(err);
      else
        deferred.resolve(zipPath);
    });

    return deferred.promise;
  });
}
module.exports = zip;

function each (options, filepath) {
  if (options.verbose) {
    console.log("Adding: " + filepath);
  }
}

/**
 * Filter for deciding what is included in a xpi based on a list of included files
 */
function filter (options, includes, root, filepath, stat) {
  var paths = path.relative(root, filepath).split(path.sep);
  // always include test/tests directory when running jpm test
  if (options.command == "test") {
    if (/^tests?$/.test(paths[0])) {
      if (paths.length == 1 && stat.isDirectory()) {
        return true;
      }
      if (paths.length > 1) {
        return true;
      }
    }
  }
  return includes.indexOf(filepath) != -1;
}
