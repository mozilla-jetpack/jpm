/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require("fs");
var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;

var simpleAddonPath = path.join(__dirname, "..", "fixtures", "simple-addon");

describe("jpm xpi", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("creates a xpi of the simple-addon", function (done) {
    var proc = exec("xpi", { addonDir: simpleAddonPath });
    proc.on("close", function () {
      var xpiPath = path.join(simpleAddonPath, "@simple-addon-1.0.0.xpi");

      utils.unzipTo(xpiPath, utils.tmpOutputDir).then(function () {
        utils.compareDirs(simpleAddonPath, utils.tmpOutputDir);
        fs.unlink(xpiPath);
        done();
      });
    });
  });
});
