var _ = require("underscore");
var path = require("path");
var execFile = require("child_process").execFile;
var fs = require("fs-extra");
var rimraf = require("rimraf");
var glob = require("glob");
var unzip = require("unzip");
var chai = require("chai");
var async = require("async");
var expect = chai.expect;
var prevCwd;

var tmpOutputDir = exports.tmpOutputDir = path.join(__dirname, "../", "tmp");

// Before each test, make the temp directory and save cwd
function setup (done) {
  prevCwd = process.cwd();
  fs.mkdirp(tmpOutputDir, done);
}
exports.setup = setup;

// After each test, revert to previous cwd, nuke the temp directory
// and clear out any XPIs, bootstrap.js, or install.rdf in the
// `./test/addons/` directory
function tearDown (done) {
  process.chdir(prevCwd);
  rimraf(tmpOutputDir, function () {
    var paths = [
      "../addons/**/*.xpi",
      "../addons/**/bootstrap.js",
      "../addons/**/install.rdf"
    ].map(function (p) { return path.join(__dirname, p); });
    
    async.map(paths, glob, function (err, files) {
      _.flatten(files).forEach(fs.unlinkSync);
      done();
    });
  });
}
exports.tearDown = tearDown;

/**
 * Utility for `exec` so we can pass in a string
 * and it preserves quoted values. Very rough and hacky, but
 * makes the interface for writing CLI tests better.
 * "-b value --binary-args \"value1 value2 value3\"" ->
 * ["-b", "value", "--binary-args", "value1 value2 value3"]
 */
function formatExecArgs (s) {
  var args = [];
  var queue = "";
  var startQuote = false;
  for (var i = 0; i < s.length; i++) {
    if (s[i] === " " && queue.length && !startQuote) {
      args.push(queue);
      queue = "";
    }
    else if (s[i] === "\"" || s[i] === "'") {
      if (startQuote) {
        args.push(queue);
        queue = "";
      } else
        startQuote = true;
    }
    else
      queue += s[i];
  }
  if (queue)
    args.push(queue);
  return args;
}

function exec (args, options, callback) {
  options = options || {};
  return execFile(path.join(__dirname, "../../bin/jpm"), formatExecArgs(args), {
    cwd: options.cwd || tmpOutputDir
  }, function (err) {
    if (callback)
      callback.apply(null, arguments);
    else if (err)
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

function isFile (filePath) {
  return fs.statSync(filePath).isFile();
}
exports.isFile = isFile;

function isDir (filePath) {
  return fs.statSync(filePath).isDirectory();
}
exports.isDir = isDir;
