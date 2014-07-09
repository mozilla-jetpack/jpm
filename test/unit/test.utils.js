var fs = require("fs");
var path = require("path");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../../lib/utils");
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
    var manifest = utils.getManifest();
    expect(manifest.name).to.be.equal("simple-addon");
    expect(manifest.title).to.be.equal("My Simple Addon");
    done();
  });

  it("getManifest() returns null when no package.json found", function (done) {
    process.chdir(path.join(__dirname, "..", "addons"));
    var manifest = utils.getManifest();
    expect(manifest).to.be.equal(null);
    done();
  });

  it("normalizeBinary() default sets", function () {
    delete process.env.JPM_FIREFOX_BINARY;
    expect(binary(null, "darwin", "x86")).to.be.equal(
      "/Applications/Firefox.app/Contents/MacOS/firefox-bin");
    expect(binary(null, "darwin", "x86_64")).to.be.equal(
      "/Applications/Firefox.app/Contents/MacOS/firefox-bin");
    expect(binary(null, "windows", "x86")).to.be.equal(
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe");
    expect(binary(null, "windows", "x86_64")).to.be.equal(
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe");
    expect(binary(null, "linux", "x86")).to.be.equal(
      "/usr/lib/firefox");
    expect(binary(null, "linux", "x86_64")).to.be.equal(
      "/usr/lib64/firefox");
  });

  it("normalizeBinary() returns binary path if passed", function () {
    var bPath = "/path/to/binary";
    expect(binary(bPath)).to.be.equal(bPath);
  });

  it("normalizeBinary() finds OSX's full path when given .app", function () {
    process.env.JPM_FIREFOX_BINARY = undefined;
    expect(binary("/Application/FirefoxNightly.app", "darwin")).to.be.equal(
      "/Application/FirefoxNightly.app/Contents/MacOS/firefox-bin");
  });
  
  it("normalizeBinary() uses JPM_FIREFOX_BINARY if no path specified", function () {
    process.env.JPM_FIREFOX_BINARY = "/my/custom/path";
    expect(binary()).to.be.equal("/my/custom/path");
  });
  
  it("normalizeBinary() uses path over JPM_FIREFOX_BINARY if specified", function () {
    process.env.JPM_FIREFOX_BINARY = "/my/custom/path";
    expect(binary("/specific/path")).to.be.equal("/specific/path");
  });

  it("normalizeBinary() normalizes special names like: firefox, nightly, etc...", function() {
    var args = 0;
    var expected = 1;

    [
      [["firefox", "darwin", "x86"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [["firefox", "darwin", "x86_64"], "/Applications/Firefox.app/Contents/MacOS/firefox-bin"],
      [["firefox", "windows", "x86"], "C:\\Program Files\\Mozilla Firefox\\firefox.exe"],
      [["firefox", "windows", "x86_64"], "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"],
      [["firefox", "linux", "x86"], "/usr/lib/firefox"],
      [["firefox", "linux", "x86_64"], "/usr/lib64/firefox"],

      [["beta", "darwin", "x86"], "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin"],
      [["beta", "darwin", "x86_64"], "/Applications/FirefoxBeta.app/Contents/MacOS/firefox-bin"],
      [["beta", "windows", "x86"], "C:\\Program Files\\Firefox Beta\\firefox.exe"],
      [["beta", "windows", "x86_64"], "C:\\Program Files (x86)\\Firefox Beta\\firefox.exe"],
      [["beta", "linux", "x86"], "/usr/lib/firefox-beta"],
      [["beta", "linux", "x86_64"], "/usr/lib64/firefox-beta"],

      [["aurora", "darwin", "x86"], "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin"],
      [["aurora", "darwin", "x86_64"], "/Applications/FirefoxAurora.app/Contents/MacOS/firefox-bin"],
      [["aurora", "windows", "x86"], "C:\\Program Files\\Aurora\\firefox.exe"],
      [["aurora", "windows", "x86_64"], "C:\\Program Files (x86)\\Aurora\\firefox.exe"],
      [["aurora", "linux", "x86"], "/usr/lib/firefox-aurora"],
      [["aurora", "linux", "x86_64"], "/usr/lib64/firefox-aurora"],

      [["nightly", "darwin", "x86"], "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin"],
      [["nightly", "darwin", "x86_64"], "/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin"],
      [["nightly", "windows", "x86"], "C:\\Program Files\\Nightly\\firefox.exe"],
      [["nightly", "windows", "x86_64"], "C:\\Program Files (x86)\\Nightly\\firefox.exe"],
      [["nightly", "linux", "x86"], "/usr/lib/firefox-nightly"],
      [["nightly", "linux", "x86_64"], "/usr/lib64/firefox-nightly"]
    ].forEach(function(fixture) {
      var actual = binary.apply(binary, fixture[args]);
      expect(actual).to.be.equal(fixture[expected]);
    });
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
