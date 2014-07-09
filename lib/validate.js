var when = require("when");
var jetpackValidation = require("jetpack-validation");
var console = require("./utils").console;

var ERRORS = ["main", "id"];
var WARNINGS = ["version", "title", "name"];

function validate (dir) {
  var errors = jetpackValidation(dir);
 
  return when.promise(function (resolve, reject) {
    Object.keys(errors).forEach(function (errorType) {
      if (~ERRORS.indexOf(errorType)) {
        reject(new Error(errors[errorType]));
      }
      if (~WARNINGS.indexOf(errorType)) {
        console.warn(errors[errorType]);
      }
    });
    resolve();
  });
}

module.exports = validate;
