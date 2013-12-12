var semver = require("semver");
var path = require("path");

function identity (x) {
  return x;
}

module.exports = {
  "name": prompt("name", path.basename(process.cwd()), identity),
  "version": prompt("version", "0.0.0", function (ver) {
    // Only return valid version strings
    if (semver.valid(ver) && /^[\.|\d]*$/.test(ver))
      return ver;
    return "0.0.0";
  }),
  "description": prompt("description", "", identity),
  "main": prompt("entry point", "index.js", identity),
  "author": prompt("author", "", identity),
  "license": prompt("license", "MIT", identity)
};
