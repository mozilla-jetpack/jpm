/* jshint expr: true, mocha: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var chai = require("chai");
var expect = chai.expect;
var profile = require("../../lib/profile");
var PREFS = require("../../data/preferences");

var simpleXpiPath = path.join(__dirname, "..", "xpis", "@simple-addon.xpi");
var unpackedXpiPath = path.join(__dirname, "..", "xpis", "@unpacked-addon.xpi");

describe("lib/profile", function () {
  it("creates a profile and returns the path", function (done) {
    profile.createProfile().then(function (profilePath) {
      var contents = fs.readFileSync(path.join(profilePath, "user.js"), "utf8");
      expect(contents).to.be.ok;
    })
    .then(done, done);
  });

  it("creates a profile with proper default preferences (Firefox)", function (done) {
    profile.createProfile().then(function (profilePath) {
      var contents = fs.readFileSync(path.join(profilePath, "user.js"), "utf8");
      var defaults = _.extend({}, PREFS.DEFAULT_COMMON_PREFS, PREFS.DEFAULT_FIREFOX_PREFS);
      comparePrefs(defaults, contents);
    })
    .then(done, done);
  });

  it("creates a profile with an addon installed when given a XPI unpacked", function (done) {
    profile.createProfile({ xpi: unpackedXpiPath }).then(function (profilePath) {
      var addonPath = path.join(profilePath, "extensions", "@unpacked-addon");
      var index = fs.readFileSync(path.join(addonPath, "index.js"));
      var manifest = fs.readFileSync(path.join(addonPath, "package.json"));
      expect(index).to.be.ok;
      expect(manifest).to.be.ok;
    })
    .then(done, done);
  });

  it("creates a profile with an addon installed when given a XPI packed", function (done) {
    profile.createProfile({ xpi: simpleXpiPath }).then(function (profilePath) {
      var addonPath = path.join(profilePath, "extensions", "@simple-addon.xpi");
      expect(fs.statSync(addonPath).isFile()).to.be.ok;
    })
    .then(done, done);
  });
});

function comparePrefs (defaults, prefs) {
  var count = Object.keys(defaults).length;
  prefs.split("\n").forEach(function (pref) {
    var parsed = pref.match(/user_pref\("(.*)", "?([^"]*)"?\)\;$/);
    if (!parsed || parsed.length < 2) return;
    var key = parsed[1];
    var value = parsed[2];

    // Cast booleans and numbers in string formative to primitives
    if (value === "true")
      value = true;
    else if (value === "false")
      value = false;
    else if (!isNaN(parseFloat(value)) && isFinite(value))
      value = +value;

    // TODO need to override firefox-profile setting default prefs
    // but we still override them if we explicitly set them
    if (key in defaults) {
      expect(defaults[key]).to.be.equal(value);
      --count;
    }
  });
  expect(count).to.be.equal(0);
}
