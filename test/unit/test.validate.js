var fs = require("fs");
var join = require("path").join;
var when = require("when");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../utils");
var validate = require("../../lib/validate");

var simpleAddonPath = join(__dirname, "..", "addons", "simple-addon");
var aomUnsupportedPath = join(__dirname, "..", "addons", "aom-unsupported");
var fixtures = join(__dirname, "fixtures", "validate");

describe("lib/validate", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Successfully validates a valid addon", function (done) {
    when.all([validate(simpleAddonPath), validate(aomUnsupportedPath)]).then(function () {
      done();
    }).then(null, done);
  });

  it("Fails with invalid ID", function (done) {
    validate(join(fixtures, "invalid-id")).then(utils.invalidResolve, function (errors) {
      expect(errors.id).to.be.ok;
    }).then(done, done);
  });

  it("Fails with no name", function (done) {
    validate(join(fixtures, "no-name")).then(utils.invalidResolve, function (errors) {
      expect(errors.name).to.be.ok;
    }).then(done, done);
  });

  it("Fails with no main or index.js", function (done) {
    validate(join(fixtures, "no-main-or-index")).then(utils.invalidResolve, function (errors) {
      expect(errors.main).to.be.ok;
    }).then(done, done);
  });

  it("Fails if main specified and DNE", function (done) {
    validate(join(fixtures, "main-dne")).then(utils.invalidResolve, function (errors) {
      expect(errors.main).to.be.ok;
    }).then(done, done);
  });
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
  it("allows @addon", function () {
    expect(validate.validateID({ id: "@addon" })).to.be.ok;
  });
  it("fails lacking GUID or domain format", function () {
    ["jetpackname", "{1234-343-342}", "jet.pack.name"].forEach(function (id) {
      expect(validate.validateID({ id: id })).to.not.be.ok;
    });
  });
  it("passes if id does not exist", function () {
    expect(validate.validateID({})).to.be.ok;
  });
});

describe("lib/validate#validateMain", function () {});
