/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

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

  zipdir(dir, {
    saveTo: zipPath,
    each: each.bind(null, options),
    filter: filter.bind(null, options)
  }, function (err) {
    if (err)
      deferred.reject(err);
    else
      deferred.resolve(zipPath);
  });

  return deferred.promise;
}
module.exports = zip;

function each (options, filepath) {
  if (options.verbose) {
    console.log("Adding: " + filepath);
  }
}

/**
 * Filter for deciding what is included in a xpi. For now, just ignore
 * zip and other xpis.
 */
function filter (options, filepath, stat) {
  var base = path.basename(filepath);
  var ignore = !/\.(zip)$/.test(filepath) // ignore zip/xpi files
      && !/^\./.test(base);  // ignore hidden files
  if (options.command != "test") {
    ignore = ignore && !(/^tests?$/.test(base) && stat.isDirectory()) // ignore test directory
  }
  return ignore;
}
