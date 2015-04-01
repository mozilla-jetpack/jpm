/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var utils = require("../utils");
var path = require("path");
var fs = require("fs");
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var jpm = utils.run;

var addonsPath = path.join(__dirname, "..", "addons");
var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

describe("jpm test addons", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  fs.readdirSync(addonsPath)
  .filter(fileFilter)
  .forEach(function (file) {
    it(file, function (done) {
      var addonPath = path.join(addonsPath, file);
      process.chdir(addonPath);

      var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
      if (process.env.DISPLAY) {
        options.env.DISPLAY = process.env.DISPLAY;
      }

      jpm("test", options).catch(console.error).then(done);
    });
  });
});

function fileFilter(file) {
  if (/^invalid-/.test(file)) {
    return false;
  }
  var stat = fs.statSync(path.join(addonsPath, file))
  return (stat && stat.isDirectory());
}
