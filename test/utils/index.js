var path = require("path");
var execFile = require("child_process").execFile;
var fs = require("fs");
var rimraf = require("rimraf");
var glob = require("glob");
var unzip = require("unzip");
var chai = require("chai");
var expect = chai.expect;
var prevCwd;

var tmpOutputDir = exports.tmpOutputDir = path.join(__dirname, "../", "tmp");

// Before each test, make the temp directory and save cwd
function setup (done) {
  prevCwd = process.cwd();
  fs.mkdir(tmpOutputDir, done);
}
exports.setup = setup;

// After each test, revert to previous cwd, nuke the temp directory
// and clear out any XPIs in the `./test/addons/` directory
function tearDown (done) {
  process.chdir(prevCwd);
  rimraf(tmpOutputDir, function () {
    glob(path.join(__dirname, "../addons/**/*.xpi"), function (err, xpis) {
      xpis.forEach(fs.unlinkSync);
      done();
    });
  });
}
exports.tearDown = tearDown;

function exec (args, options) {
  options = options || {};
  return execFile(path.join(__dirname, "../../bin/jpm"), args.split(" "), {
    cwd: options.cwd || tmpOutputDir
  }, function (err) {
    if (err)
      throw err;
  });
}
exports.exec = exec;

function unzipTo (xpiPath, outputDir, callback) {
  fs.createReadStream(xpiPath)
    .pipe(unzip.Extract({ path: outputDir }))
    .on('close', callback);
}
exports.unzipTo = unzipTo;


function filterXPI (filename) {
  return !/\.xpi$/.test(filename);
}

function compareDirs (dir1, dir2, done) {
  var files1 = fs.readdirSync(dir1).filter(filterXPI);
  var files2 = fs.readdirSync(dir2).filter(filterXPI);

  expect(files1.length).to.be.equal(files2.length);

  files1.forEach(function (file) {
    var s1 = fs.readFileSync(path.join(dir1, file), "utf-8");
    var s2 = fs.readFileSync(path.join(dir2, file), "utf-8");
    expect(s1).to.be.equal(s2);
  });
  done();
}
exports.compareDirs = compareDirs;
