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
    validate(join(fixtures, "invalid-id")).then(utils.invalidResolve, function (error) {
      expect(error).to.be.ok;
    }).then(done, done);
  });

  it("Fails with no name", function (done) {
    validate(join(fixtures, "no-name")).then(utils.invalidResolve, function (errors) {
      expect(errors.name).to.be.ok;
    }).then(done, done);
  });

  it("Fails with no main or index.js", function (done) {
    validate(join(fixtures, "no-main-or-index")).then(utils.invalidResolve, function (error) {
      expect(error).to.be.ok;
    }).then(done, done);
  });

  it("Fails if main specified and DNE", function (done) {
    validate(join(fixtures, "main-dne")).then(utils.invalidResolve, function (error) {
      expect(error).to.be.ok;
    }).then(done, done);
  });
});
