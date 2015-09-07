var BLACKLIST = [
  // skip test documentation during continuous testing builds
  // NOTE: you can still run it manually using "npm run documentation"
  "test.docs.js"
];

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
  return /^test\..*\.js$/.test(path.basename(filepath)) &&
         !~BLACKLIST.indexOf(path.basename(filepath));
}

function done () {
  mocha.run(function (failures) {
    process.exit(failures);
  });
}
