var fs = require("fs");
var path = require("path");
var when = require("when");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../utils");
var validate = require("../../lib/validate");

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var aomUnsupportedPath = path.join(__dirname, "..", "addons", "aom-unsupported");
var tmpOutputDir = path.join(__dirname, "../", "tmp");
var prevCwd;

describe("lib/validate", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Successfully validates a valid addon", function (done) {
    process.chdir(simpleAddonPath);
    var manifest1 = require(path.join(simpleAddonPath, "package.json"));
    var manifest2 = require(path.join(aomUnsupportedPath, "package.json"));
    when.all([validate(manifest1), validate(manifest2)]).then(function () {
      done();
    }).then(null, done);
  });

  it("Fails with invalid ID");
  it("Fails with no main or index.js")
  it("Fails no ID");
  it("Fails if main specified and DNE");
});

describe("lib/validate#validateID", function () {
  it("allows GUIDs", function () {
    expect(validate.validateID({ id: "{abcdef23-4934-139a-823b-83940bcfae3d}" })).to.be.ok;
  });
  it("allows domain@format", function () {
    expect(validate.validateID({ id: "domain@format" })).to.be.ok;
  });
  it("allows domain@format.exten.ded", function () {
    expect(validate.validateID({ id: "domain@format.exten.ded" })).to.be.ok;
  });
  it("fails lacking GUID or domain format", function () {
    ["jetpackname", "{1234-343-342}", "jet.pack.name"].forEach(function (id) {
      expect(validate.validateID({ id: id })).to.not.be.ok;
    });
  });
  it("fails if id does not exist", function () {
    expect(validate.validateID({})).to.not.be.ok;
  });
});

describe("lib/validate#validateMain", function () {});
