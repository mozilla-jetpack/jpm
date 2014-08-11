var utils = require("../utils");
var path = require("path");
var exec = utils.exec;

var addonsPath = path.join(__dirname, "..", "addons");
var toolbarAddonPath = path.join(addonsPath, "toolbar-api");

var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

describe("jpm test", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  describe("run tests", function () {
    it("toolbar-api", function (done) {
      process.chdir(toolbarAddonPath);

      var options = { cwd: toolbarAddonPath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("test", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("2 of 2 tests passed.");
        done();
      });
    });
  });
});
