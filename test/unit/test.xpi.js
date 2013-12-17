var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var xpi = require("../../lib/xpi");

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var tmpOutputDir = path.join(__dirname, "../", "tmp");
var prevCwd;

describe("lib/xpi", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Zips up cwd's addon", function (done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(simpleAddonPath, "simple-addon.xpi"));
      utils.unzipTo(xpiPath, tmpOutputDir, function () {
        utils.compareDirs(simpleAddonPath, tmpOutputDir, done);
      });
    }).then(null, done);
  });
});

function cleanXPI (done) {
  fs.unlinkSync(path.join(simpleAddonPath, "simple-addon.xpi"));
  done();
}
