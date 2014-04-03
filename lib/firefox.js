var execFile = require("child_process").execFile;
var defer = require("when").defer;
var createProfile = require("./profile");
var console = require("./utils").console;
var normalizeBinary = require("./utils").normalizeBinary;

function runFirefox (options) {
  var profileDeferred = defer();
  options = options || {};
  var binary = normalizeBinary(options.binary);
  console.log('binary: '+binary);
  var args = [];

  // Create profile if none passed in
  if (!options.profile) {
    console.log('creating profile')
    createProfile(options).then(profileDeferred.resolve);
  } else {
    console.log('use profile')
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

    console.log('binary: ' + binary);
    console.log('args: ' + JSON.stringify(args))
    var task = execFile(binary, args);
    if (options.verbose) {
      task.stdout.pipe(process.stdout);
      task.stderr.pipe(process.stdout);
    }

    return task;
  });
}
module.exports = runFirefox;
