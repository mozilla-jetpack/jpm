var path = require("path");
var dive = require("dive");
var Mocha = require("mocha");
var mocha = new Mocha({
  ui: "bdd",
  reporter: "spec",
  timeout: 20000
});
var type = process.argv[2];
var directory = type ? path.join(__dirname, type) : __dirname;

process.env.NODE_ENV = "test";

dive(directory, function (err, filepath) {
  if (err) throw err;
  if (testFilter(filepath)) {
    mocha.addFile(filepath);
  }
}, done);

function testFilter (filepath) {
  return /^test\..*\.js$/.test(path.basename(filepath));
}

function done () {
  mocha.run(function (failures) {
    process.exit(failures);
  });
}
