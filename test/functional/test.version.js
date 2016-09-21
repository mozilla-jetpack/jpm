/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;
var pjson = require("../../package.json");

describe("jpm version", function() {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("prints the version number", function(done) {
    var proc = exec("version", {}, function(error, stdout, stderr) {
      expect(stdout.trim()).to.equal(pjson.version);
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(0);
    });
  });
});
