var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var unzip = require("unzip");
var chai = require("chai");
var expect = chai.expect;
var xpi = require("../lib/xpi");

var simpleAddonPath = path.join(__dirname, "addons", "simple-addon");
var tmpOutputDir = path.join(__dirname, "tmp");
var prevCwd;

describe("lib/xpi", function () {
  // Before each test, make the temp directory and save cwd
  beforeEach(function (done) {
    prevCwd = process.cwd();
    fs.mkdir(tmpOutputDir, done);
  });

  // After each test, revert to previous cwd and nuke the temp directory
  afterEach(function (done) {
    process.chdir(prevCwd);
    rimraf(tmpOutputDir, function () {
      cleanXPI(done);
    });
  });

  it("Zips up cwd's addon", function (done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(simpleAddonPath, "simple-addon.xpi"));
      fs.createReadStream(xpiPath)
        .pipe(unzip.Extract({ path: tmpOutputDir }))
        .on('close', function () {
          compareDir(simpleAddonPath, tmpOutputDir, done);
        });
    }).then(null, done);
  });
});

function filterXPI (filename) {
  return !/\.xpi$/.test(filename);
}

function compareDir (dir1, dir2, done) {
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

function cleanXPI (done) {
  fs.unlinkSync(path.join(simpleAddonPath, "simple-addon.xpi"));
  done();
}
