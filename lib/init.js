var promzard = require("promzard");
var fs = require("fs");
var read = require("read");
var when = require("when");
var path = require("path");
var initInput = require.resolve("./init-input");
var console = require("./utils").console;

function init (options) {
  var deferred = when.defer();

  var packagePath = path.join(process.cwd(), "package.json");
  promzard(initInput, {}, function (err, data) {
    if (err)
      deferred.reject(err);

    data = JSON.stringify(data, null, 2) + "\n";
    console.log("About to write to %s:\n\n%s\n", packagePath, data);
    read({
      prompt: "Is this ok? ",
      default: "yes"
    }, function (err, ok) {
      if (!ok || ok.toLowerCase().charAt(0) !== "y") {
        console.log("Aborted.");
      } else {
        fs.writeFile(packagePath, data, "utf-8", function (err) {
          if (err) deferred.reject(err);
          else deferred.resolve();
        });
      }
    });
  });

  return deferred.promise;
}
module.exports = init;
