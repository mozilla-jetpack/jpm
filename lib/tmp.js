var tmp = require("tmp");
var defer = require("when").defer;

function createTmpFile(options) {
  var deferred = defer();

  tmp.file({
    mode: 0644,
    prefix: options.prefix || "jpm-tmp-",
    postfix: options.postfix || ".txt"
  }, function(err, path, fd) {
    if (err) {
      return defered.reject(err);
    }

    deferred.resolve(path);
  });

  return deferred.promise;
}
exports.createTmpFile = createTmpFile;
