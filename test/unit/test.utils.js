/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var os = require("os");
var fs = require("fs");
var path = require("path");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../../lib/utils");
var all = require("when").all;
var hasAOMSupport = utils.hasAOMSupport;

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var prevDir, prevBinary;

describe("lib/utils", function () {
  beforeEach(function () {
    if (process.env.JPM_FIREFOX_BINARY)
      prevBinary = process.env.JPM_FIREFOX_BINARY;
    prevDir = process.cwd();
  });
  afterEach(function () {
    if (prevBinary)
      process.env.JPM_FIREFOX_BINARY = prevBinary;
    process.chdir(prevDir);
  });

  it("getManifest() returns manifest in cwd()", function (done) {
    process.chdir(simpleAddonPath);
    utils.getManifest().then(function(manifest) {
      expect(manifest.name).to.be.equal("simple-addon");
      expect(manifest.title).to.be.equal("My Simple Addon");
      done();
    });
  });

  it("getManifest() returns {} when no package.json found", function (done) {
    process.chdir(path.join(__dirname, "..", "addons"));
    utils.getManifest().then(function(manifest) {
      expect(Object.keys(manifest).length).to.be.equal(0);
      done();
    });
  });

  describe("hasAOMSupport", function () {
    it("hasAOMSupport true for valid ranges", function () {
      [">=51 <=54", ">=50.0a <=52", ">=50", ">=51.0a"].forEach(function (range) {
        expect(hasAOMSupport({ engines: { 'firefox': range } })).to.be.equal(true);
      });
    });
    it("hasAOMSupport false for invalid ranges", function () {
      [">=28 <=34", ">=30 <=32", ">=26", ">=30.0a", ">=38 <=44"].forEach(function (range) {
        expect(hasAOMSupport({ engines: { 'firefox': range } })).to.be.equal(false);
      });
    });
    it("hasAOMSupport false for unspecified min", function () {
      ["<26", "<=32", "<40.0a"].forEach(function (range) {
        expect(hasAOMSupport({ engines: { 'firefox': range } })).to.be.equal(false);
      });
    });
    it("hasAOMSupport false for no engines field", function () {
      expect(hasAOMSupport({})).to.be.equal(false);
    });
    it("hasAOMSupport false for unpopulated engines field", function () {
      expect(hasAOMSupport({ engines: {}})).to.be.equal(false);
    });
    it("hasAOMSupport false for one valid and one invalid engine", function () {
      expect(hasAOMSupport({ engines: {
        "firefox": ">=40.0a",
        "fennec": "<31"
      }})).to.be.equal(false);
    });
  });
});
