var path = require("path");

module.exports = {
  "title": prompt("title", "My Jetpack Addon", identity),
  "name": prompt("name", path.basename(process.cwd()), sanitizeName),
  "version": prompt("version", "0.0.0", sanitizeVersion),
  "description": prompt("description", "", identity),
  "main": prompt("entry point", "index.js", identity),
  "author": prompt("author", "", identity),
  "engines": prompt("engines (comma separated)", "firefox,fennec", splitObject),
  "license": prompt("license", "MIT", identity)
};

/**
 * Returns the argument passed into it.
 *
 * @param {Mixed} x
 * @return {Mixed}
 */

function identity (x) {
  return x;
}

/**
 * Takes a string and filters out anything that is not
 * a letter, number, or dash (-) and casts to lower case.
 *
 * @param {String} name
 * @return {String}
 */

function sanitizeName (name) {
  name = name || "";
  return name.replace(/[^\w-]|_/g,'').toLowerCase();
}

/**
 * Takes a version string ('1.0.4') and ensures it is a valid semver
 * string. Does not accept ambiguous semver strings like '>= 0.4.x', and
 * the like.
 *
 * @param {String} version
 * @return {String}
 */

function sanitizeVersion (ver) {
  if (/^\d+\.\d+\.\d+$/.test(ver))
    return ver;
  return "0.0.0";
}

/**
 * Takes a comma-separated string and returns an object with each
 * value in the string a property of the object with a '*' value
 *
 * @param {String} input
 * @return {Object}
 */

function splitObject (input) {
  return input.split(',').reduce(function (obj, value) {
    obj[value.trim()] = "*";
    return obj;
  }, {});
}
