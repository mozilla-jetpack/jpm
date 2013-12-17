var path = require("path");
var execFile = require("child_process").execFile;
var fs = require("fs");
var rimraf = require("rimraf");
var prevCwd;

var tmpOutputDir = exports.tmpOutputDir = path.join(__dirname, "../", "tmp");

// Before each test, make the temp directory and save cwd
function setup (done) {
  prevCwd = process.cwd();
  fs.mkdir(tmpOutputDir, done);
}
exports.setup = setup;

// After each test, revert to previous cwd and nuke the temp directory
function tearDown (done) {
  process.chdir(prevCwd);
  rimraf(tmpOutputDir, done);
}
exports.tearDown = tearDown;

function exec (args) {
  return execFile("../../bin/jpm", args.split(" "), {
    cwd: tmpOutputDir
  }, function (err) {
    if (err)
      throw err;
  });
}
exports.exec = exec;
