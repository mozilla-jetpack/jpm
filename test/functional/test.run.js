var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;
var isWindows = /^win/.test(process.platform);

var addonsPath = path.join(__dirname, "..", "addons");
var simpleAddonPath = path.join(addonsPath, "simple-addon");
var paramDumpPath = path.join(addonsPath, "param-dump");
var loaderOptionsPath = path.join(addonsPath, "loader-options");
var overloadablePath = path.join(addonsPath, "overloadable");
var fakeBinary = path.join(__dirname, "..", "utils", "dummybinary" +
  (isWindows ? ".bat" : ".sh"));

var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

describe("jpm run", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  describe("-o/--overload", function () {
    it("overloads the SDK if overload set and uses [path] if given", function (done) {
      process.env.JETPACK_ROOT = "";
      var sdkPath = path.join(__dirname, "../fixtures/mock-sdk");
      var options = { cwd: overloadablePath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run -v -o " + sdkPath, options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("OVERLOADED STARTUP");
        done();
      });
    });

    it("overloads the SDK if overload set and JETPACK_ROOT set", function (done) {
      process.env.JETPACK_ROOT = path.join(__dirname, "../fixtures/mock-sdk");
      var options = { cwd: overloadablePath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run -o -v", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("OVERLOADED STARTUP");
        done();
      });
    });

    it("overloads the SDK with [path] if set over JETPACK_ROOT", function (done) {
      process.env.JETPACK_ROOT = "/an/invalid/path";
      var sdkPath = path.join(__dirname, "../fixtures/mock-sdk");
      var options = { cwd: overloadablePath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run -v -o " + sdkPath, options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("OVERLOADED STARTUP");
        done();
      });
    });

    it("does not overload if overload set and JETPACK_ROOT is not set", function (done) {
      process.env.JETPACK_ROOT = "";
      var options = { cwd: overloadablePath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run -o -v", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.not.contain("OVERLOADED STARTUP");
        expect(stdout).to.contain("overloadable addon running");
        done();
      });
    });
  });

  describe("-v/--verbose", function () {
    it("logs out only console messages from the addon without -v", function (done) {
      process.chdir(paramDumpPath);
      var options = { cwd: paramDumpPath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("\nconsole\.log: param-dump:")
        expect(stdout).to.contain("PARAMS DUMP START");
        done();
      });
    });

    it("logs out everything from console with -v", function (done) {
      process.chdir(paramDumpPath);
      var options = { cwd: paramDumpPath, env: { JPM_FIREFOX_BINARY: binary }};
      var proc = exec("run -v", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout.split("\n").length).to.be.gt(20);
        done();
      });
    });
  });

  describe("-b/--binary <BINARY>", function () {
    it("Uses specified binary instead of default Firefox", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary, { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile");
        done();
      });
    });
  });

  describe("--binary-args <CMDARGS>", function () {
    it("Passes in additional arguments to Firefox (single)", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " --binary-args -some-value", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-some-value");
        done();
      });
    });

    it("Passes in additional arguments to Firefox (multiple)", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " --binary-args \"-one -two -three\"", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-one -two -three");
        done();
      });
    });
  });

  describe("-p/--profile", function () {
    it("Passes in a relative profile path to Firefox with -profile", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p ./path/to/profile", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile ./path/to/profile");
        done();
      });
    });

    it("Passes in a absolute profile path to Firefox with -profile", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p /path/to/profile", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile /path/to/profile");
        done();
      });
    });

    it("Passes in a profile name to Firefox with -P", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p MY_PROFILE", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-P MY_PROFILE");
        done();
      });
    });

    describe("options passed to an add-on", function() {
      var options = { cwd: paramDumpPath, env: { JPM_FIREFOX_BINARY: binary } }

      function readParams(stdout) {
        var output = stdout.toString()
        var start = "PARAMS DUMP START";
        var end = "PARAMS DUMP END";
        var data = output.slice(output.indexOf(start) + start.length,
                                output.indexOf(end));
        var json = {};
        try {
          json = JSON.parse(data);
        }
        catch (e) {
          console.log('Something is wrong with output:\n' + output);
        }
        return json;
      }

      it("run with only -v option", function(done) {
        process.chdir(paramDumpPath);
        var task = exec("run -v", options, function(error, stdout, stderr) {
          expect(error).to.not.be.ok;
          //expect(stderr).to.not.be.ok;
          //expect(stderr).to.not.be.ok;

          var params = readParams(stdout);

          expect(params.command).to.equal("run");

          expect(params.profileMemory).to.equal(null);
          expect(params.checkMemory).to.equal(null);

          expect(params.filter).to.equal(null);
          expect(params.times).to.equal(null);
          expect(params.stopOnError).to.equal(false);

          expect(params.tbpl).to.equal(false);
          expect(params.verbose).to.equal(true);

          expect(params.sdkPath).to.equal(null);

          done();
        });
      });

      it("run with options should receive options", function(done) {
        process.chdir(paramDumpPath);
        var cmd = "run -v --profile-memory --check-memory --filter bar --times 3 --stop-on-error --tbpl"
        var task = exec(cmd, options, function(error, stdout, stderr) {
          expect(error).to.not.be.ok;
          //expect(stderr).to.not.be.ok;

          var params = readParams(stdout);

          expect(params.command).to.equal("run");

          expect(params.profileMemory).to.equal(true);
          expect(params.checkMemory).to.equal(true);

          expect(params.filter).to.equal("bar");
          expect(params.times).to.equal(3);
          expect(params.stopOnError).to.equal(true);

          expect(params.tbpl).to.equal(true);
          expect(params.verbose).to.equal(true);

          expect(params.sdkPath).to.equal(null);

          done();
        });
      });
    });
  });

  describe("SDK context", function () {
    it("@loader/options#metadata loads in package.json", function (done) {
      process.chdir(loaderOptionsPath);
      var options = { cwd: loaderOptionsPath, env: { JPM_FIREFOX_BINARY: binary }};
      var task = exec("run -v", options, function(error, stdout, stderr) {
        expect(error).to.not.be.ok;

        var lines = stdout.toString().split("\n").filter(function (line) {
          return /loader-options: @loader\/options/.test(line);
        }).map(function (line) {
          var segments = line.split(":");
          while (segments.length > 2) segments.shift();
          return segments;
        });

        expect(lines[0][0]).to.be.equal("title");
        expect(lines[0][1]).to.be.equal("Loader Options");
        expect(lines[1][0]).to.be.equal("name");
        expect(lines[1][1]).to.be.equal("loader-options");

        done();
      });
    });
  });
});
