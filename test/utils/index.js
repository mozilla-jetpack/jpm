var _ = require("lodash");
var path = require("path");
var child_process = require("child_process");
var execFile = child_process.execFile;
var fs = require("fs-extra");
var rimraf = require("rimraf");
var glob = require("glob");
var unzip = require("unzip");
var chai = require("chai");
var async = require("async");
var when = require("when");
var expect = chai.expect;
var assert = chai.assert;
var prevCwd;
var prevJetpackRoot;

var tmpOutputDir = exports.tmpOutputDir = path.join(__dirname, "../", "tmp");

var jpm = path.join(__dirname, "../../bin/jpm");

// Before each test, make the temp directory and save cwd, and store JETPACK_ROOT env
function setup (done) {
  prevJetpackRoot = process.env.JETPACK_ROOT;
  prevCwd = process.cwd();
  fs.mkdirp(tmpOutputDir, done);
}
exports.setup = setup;

// After each test, revert to previous cwd, nuke the temp directory
// and clear out any XPIs, bootstrap.js, or install.rdf in the
// `./test/addons/` directory
function tearDown (done) {
  process.env.JETPACK_ROOT = prevJetpackRoot;
  process.chdir(prevCwd);
  rimraf(tmpOutputDir, function () {
    var paths = [
      "../fixtures/**/*.xpi",
      "../fixtures/**/bootstrap.js",
      "../fixtures/**/install.rdf",
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

function exec (args, options, callback) {
  options = options || {};
  var env = _.extend({}, options.env, process.env);

  return child_process.exec("node " + jpm + " " + args, {
    cwd: options.cwd || tmpOutputDir,
    env: env
  }, function (err, stdout, stderr) {
    if (callback)
      callback.apply(null, arguments);
    else if (err)
      throw err;
  });
}
exports.exec = exec;

function spawn (cmd, options) {
  options = options || {};
  var env = _.extend({}, options.env, process.env);

  return child_process.spawn("node", [
    jpm, cmd, "-v", "-f", options.filter || ""
  ],
  {
    cwd: options.cwd || tmpOutputDir,
    env: env
  });
}
exports.spawn = spawn;

function run (cmd, options, p) {
  return when.promise(function(resolve) {
    var output = [];
    var proc = spawn(cmd, options);
    proc.stderr.pipe(process.stderr);
    proc.stdout.on("data", function (data) {
      output.push(data);
    });
    if (p) {
      proc.stdout.pipe(p.stdout);
    }
    proc.on("close", function(code) {
      var out = output.join("");
      var noTests = /No tests were run/.test(out);
      var hasSuccess = /All tests passed!/.test(out);
      var hasFailure = /There were test failures\.\.\./.test(out);
      if (noTests || hasFailure || !hasSuccess || code != 0) {
        process.stdout.write(out);
      }
      expect(code).to.equal(hasFailure ? 1 : 0);
      expect(hasFailure).to.equal(false);
      expect(hasSuccess).to.equal(true);
      expect(noTests).to.equal(false);
      resolve();
    });
  });
}
exports.run = run;

function unzipTo (xpiPath, outputDir) {
  return when.promise(function(resolve, reject) {
    fs.createReadStream(xpiPath)
      .pipe(unzip.Extract({ path: outputDir }))
      .on('close', resolve);
  });
}
exports.unzipTo = unzipTo;


function filterXPI (filename) {
  return !/^(?:[^\.]*\.xpi|install.rdf|bootstrap.js)$/.test(filename);
}

function compareDirs (dir1, dir2) {
  var files1 = fs.readdirSync(dir1).filter(filterXPI);
  var files2 = fs.readdirSync(dir2).filter(filterXPI);

  expect(files1.join(",")).to.be.equal(files2.join(","));

  files1.forEach(function (file) {
    var s1 = fs.readFileSync(path.join(dir1, file), "utf-8");
    var s2 = fs.readFileSync(path.join(dir2, file), "utf-8");
    expect(s1).to.be.equal(s2);
  });
}
exports.compareDirs = compareDirs;

function isFile (filePath) {
  try {
    var exists = fs.statSync(filePath).isFile();
    return exists;
  } catch (e) {
    return false;
  }
}
exports.isFile = isFile;

function isDir (filePath) {
  return fs.statSync(filePath).isDirectory();
}
exports.isDir = isDir;

function invalidResolve () {
  assert.fail(null, null, 'promise should not resolve');
}
exports.invalidResolve = invalidResolve;

function isTravis() {
  return (process.env.JPM_FIREFOX_BINARY == "travis");
}
exports.isTravis = isTravis;
