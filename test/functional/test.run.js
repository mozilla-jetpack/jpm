var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;
var isWindows = /^win/.test(process.platform);

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var fakeBinary = path.join(__dirname, "..", "utils", "dummybinary" +
  (isWindows ? ".bat" : ".sh"));

describe("jpm run", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  describe("-b/--binary <BINARY>", function () {
    it("Uses specified binary instead of default Firefox", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary, { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain('-profile');
        done();
      });
    });
  });
});
