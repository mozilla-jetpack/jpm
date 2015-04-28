/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var os = require("os");
var promzard = require("promzard");
var fs = require("fs-promise");
var read = require("read");
var when = require("when");
var join = require("path").join;
var initInput = require.resolve("./init-input");
var console = require("./utils").console;

var SOURCE_INDEX = join(__dirname, "../data/index.js");
var SOURCE_README = join(__dirname, "../data/README.md");
var SOURCE_TEST = join(__dirname, "../data/test-index.js");

var packageDataTemp;

function init (options) {
  var root = process.cwd();

  return createManifest(root)
    .then(createFiles.bind(null, root))
    .catch(console.error);
}
module.exports = init;

function createManifest (root) {
  return when.promise(function(resolve, reject) {
    var packagePath = join(root, "package.json");

    promzard(initInput, {}, function (err, data) {
      if (err) {
        return reject(err);
      }

      // convert to json string which a human can read
      data = JSON.stringify(data, null, 2) + "\n";

      packageDataTemp = JSON.parse(data);
      console.log("About to write to %s:\n\n%s\n", packagePath, data);
      read({
        prompt: "Is this ok? ",
        default: "yes"
      }, function (err, ok) {
        if (!ok || ok.toLowerCase().charAt(0) !== "y") {
          return reject("Aborted.");
        }
        else {
          fs.writeFile(packagePath, data, "utf-8").then(resolve, reject);
        }
      });
    });
  });
}

function createFiles (root) {
  var indexPath = join(root, "index.js");
  var readmePath = join(root, "README.md");
  var testDirPath = join(root, "test");
  var testPath = join(testDirPath, "test-index.js");

  return fs.exists(indexPath).then(function (exists) {
    return (exists) ? null : fs.copy(SOURCE_INDEX, indexPath);
  })
  .then(function() {
    return fs.exists(readmePath);
  })
  .then(function(exists) {
    return (exists) ? null : fs.writeFileSync(readmePath, "#" + packageDataTemp.title + os.EOL + packageDataTemp.description);
  })
  .then(function () {
    return fs.mkdirp(testDirPath);
  })
  .then(function () {
    return fs.exists(testPath)
  })
  .then(function (exists) {
    return (exists) ? null : fs.copy(SOURCE_TEST, testPath);
  });
}
