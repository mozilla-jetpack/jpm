var execFile = require("child_process").execFile;
var defer = require("when").defer;
var createProfile = require("./profile");
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;

function runFirefox (options) {
  var profileDeferred = defer();
  var runDeferred = defer();
  options = options || {};
  var binary = normalizeBinary(options.binary);
  var args = [];

  // Create profile if none passed in
  if (!options.profile) {
    createProfile(options).then(profileDeferred.resolve);
  }
  else {
    profileDeferred.resolve(options.profile);
  }

  return profileDeferred.promise.then(function (profile) {
    // Firefox takes -P if given a profile name and
    // -profile if given a path (starting with "/" or "./").
    if (/^\.?\//.test(profile))
      args = args.concat(['-profile', profile]);
    else
      args = args.concat(['-P', profile]);

    if (options.binaryArgs)
      args = args.concat(options.binaryArgs.split(" "));

    var task = execFile(binary, args, null, function(err, stdout, stderr) {
      if (options.verbose) {
        if (err) {
          process.stdout.write('err: ' + err + '\n');
        }
        process.stdout.write(stdout);
        process.stderr.write(stderr);
      }
      runDeferred.resolve(task);
    });
    task.stdout.pipe(process.stdout);
    task.stderr.pipe(process.stderr);

    return task;
  });
}
module.exports = runFirefox;
