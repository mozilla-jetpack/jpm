var fs = require("fs");
var path = require("path");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../../lib/utils");
var binary = utils.normalizeBinary;
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
});
