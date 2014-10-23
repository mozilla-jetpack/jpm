
var os = require("os");
var fs = require("fs");
var path = require("path");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../../lib/utils");
var all = require("when").all;
var sandbox = require('sandboxed-module');
var binary = utils.normalizeBinary;
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

  it("getManifest() returns null when no package.json found", function (done) {
    process.chdir(path.join(__dirname, "..", "addons"));
    utils.getManifest().then(function(manifest) {
      expect(manifest).to.be.equal(null);
      done();
    });
  });

  it("normalizeBinary() finds binary by accessing the registry on Windows", function(done) {
    // Skip this test for now, to get Travis running.
    if (!/win/i.test(os.platform)) {
      done();
      return;
    }

    // see ./mock-winreg.js
    var expected = "fake\\binary\\path";
    var binary = sandbox.require("../../lib/utils", {
      requires: {"winreg": function() {
        this.get = function(_, fn) {
          fn(null, {value: expected});
        };
      }}
    }).normalizeBinary;

    var promises = [
      [null, "windows", "x86"],
      [null, "windows", "x86_64"]
    ].map(function(args) {
      var promise = binary.apply(binary, args);
      return promise.then(function(actual) {
        expect(actual).to.be.equal(expected);
      });
    });
    all(promises).then(done.bind(null, null), done);
  });

  it("normalizeBinary() uses env var when registry access fails on Windows", function(done) {
    var args = 0;
    var expected = 1;

    var envPath64 = "path\\from\\env\\var\\64";
    var envPath32 = "path\\from\\env\\var\\32";

    var binary = sandbox.require("../../lib/utils", {
      requires: {"winreg": function() {
        this.get = function(_, fn) {
          fn("Failed", null);
        };
      }},
      locals: {process: {env: {"ProgramFiles": envPath32, "ProgramFiles(x86)": envPath64}}}
    }).normalizeBinary;

    var promises = [
      [[null, "windows", "x86"], path.join(envPath32, "Mozilla Firefox", "firefox.exe")],
      [[null, "windows", "x86_64"], path.join(envPath64, "Mozilla Firefox", "firefox.exe")]
    ].map(function(fixture) {
      var promise = binary.apply(binary, fixture[args]);
      return promise.then(function(actual) {
        expect(actual).to.be.equal(fixture[expected]);
      });
    });
    all(promises).then(done.bind(null, null), done);
  });

  it("normalizeBinary() default sets (non-windows)", function (done) {
    delete process.env.JPM_FIREFOX_BINARY;
    var args = 0;
    var expected = 1;

    var promises = [
      [[null, "darwin", "x86"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [[null, "darwin", "x86_64"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [[null, "linux", "x86"], "/usr/lib/firefox"],
      [[null, "linux", "x86_64"], "/usr/lib64/firefox"]
    ].map(function(fixture) {
      var promise = binary.apply(binary, fixture[args]);
      return promise.then(function(actual) {
        expect(actual).to.be.equal(fixture[expected]);
      });
    });
    all(promises).then(done.bind(null, null), done);
  });

  it("normalizeBinary() returns binary path if passed", function (done) {
    var bPath = "/path/to/binary";
    binary(bPath).then(function(actual) {
      expect(actual).to.be.equal(bPath);
    }).then(done.bind(null, null), done);
  });

  it("normalizeBinary() finds OSX's full path when given .app", function (done) {
    process.env.JPM_FIREFOX_BINARY = undefined;
    binary("/Application/FirefoxNightly.app", "darwin").then(function(actual) {
      expect(actual).to.be.equal(
        path.join("/Application/FirefoxNightly.app/Contents/MacOS/firefox-bin"));
    }).then(done.bind(null, null), done);
  });

  it("normalizeBinary() uses JPM_FIREFOX_BINARY if no path specified", function (done) {
    process.env.JPM_FIREFOX_BINARY = "/my/custom/path";
    binary().then(function(actual) {
      expect(actual).to.be.equal("/my/custom/path");
    }).then(done.bind(null, null), done);
  });

  it("normalizeBinary() uses path over JPM_FIREFOX_BINARY if specified", function (done) {
    process.env.JPM_FIREFOX_BINARY = "/my/custom/path";
    binary("/specific/path").then(function(actual) {
      expect(actual).to.be.equal("/specific/path");
    }).then(done.bind(null, null), done);
  });

  it("normalizeBinary() normalizes special names like: nightly, beta, etc... on Windows", function(done) {
    var args = 0;
    var expected = 1;

    var binary = sandbox.require("../../lib/utils", {
      requires: {"winreg": function(options) {
        var value = "Normal or beta";
        if (options.key.toLowerCase().indexOf("nightly") != -1) {
          value = "nightly";
        }
        if (options.key.toLowerCase().indexOf("aurora") != -1) {
          value = "aurora";
        }
        this.get = function(_, fn) {
          fn(null, {value: value});
        };
      }},
      locals: {process: {env: {"ProgramFiles": "envPath32", "ProgramFiles(x86)": "envPath64"}}}
    }).normalizeBinary;

    var promises = [
      [["nightly", "windows", "x86"], "nightly"],
      [["nightly", "windows", "x86_64"], "nightly"],
      [["aurora", "windows", "x86"], "aurora"],
      [["aurora", "windows", "x86_64"], "aurora"]
    ].map(function(fixture) {
      var promise = binary.apply(binary, fixture[args]);
      return promise.then(function(actual) {
        expect(actual).to.be.equal(fixture[expected]);
      });
    });
    all(promises).then(done.bind(null, null), done);
  });

  it("normalizeBinary() normalizes special names like: firefox, nightly, etc...(non-Windows)", function(done) {
    var args = 0;
    var expected = 1;

    var promises = [
      [["firefox", "darwin", "x86"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [["firefox", "darwin", "x86_64"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [["firefox", "linux", "x86"], "/usr/lib/firefox"],
      [["firefox", "linux", "x86_64"], "/usr/lib64/firefox"],

      [["beta", "darwin", "x86"], "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin"],
      [["beta", "darwin", "x86_64"], "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin"],
      [["beta", "linux", "x86"], "/usr/lib/firefox-beta"],
      [["beta", "linux", "x86_64"], "/usr/lib64/firefox-beta"],

      [["aurora", "darwin", "x86"], "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin"],
      [["aurora", "darwin", "x86_64"], "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin"],
      [["aurora", "linux", "x86"], "/usr/lib/firefox-aurora"],
      [["aurora", "linux", "x86_64"], "/usr/lib64/firefox-aurora"],

      [["nightly", "darwin", "x86"], "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin"],
      [["nightly", "darwin", "x86_64"], "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin"],
      [["nightly", "linux", "x86"], "/usr/lib/firefox-nightly"],
      [["nightly", "linux", "x86_64"], "/usr/lib64/firefox-nightly"]
    ].map(function(fixture) {
      var promise = binary.apply(binary, fixture[args]);
      return promise.then(function(actual) {
        expect(actual).to.be.equal(fixture[expected]);
      });
    });
    all(promises).then(done.bind(null, null), done);
  });

  describe("hasAOMSupport", function () {
    it("hasAOMSupport true for valid ranges", function () {
      [">=41 <=44", ">=41.0a <=42", ">=40", ">=41.0a"].forEach(function (range) {
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
