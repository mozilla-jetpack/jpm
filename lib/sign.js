/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var tmp = require("tmp");
var nodefn = require("when/node");
var path = require("path");
var when = require("when");

var DefaultAMOClient = require("./amo-client").Client;
var cmd = require("./cmd");
var utils = require("./utils");
var logger = utils.console;
var xpi = require("./xpi");

var AMO_API_PREFIX = require("./settings").AMO_API_PREFIX;

function getXpiInfoForSigning(options) {
  options = _.assign({
    addonDir: process.cwd(),
    xpiPath: null,
  }, options);

  if (!options.xpiPath) {
    return utils.getManifest({addonDir: options.addonDir})
      .then(function(manifest) {
        return utils.getXpiInfoFromManifest(manifest);
      });
  } else {
    return utils.getXpiInfo(options.xpiPath);
  }
}
exports.getXpiInfoForSigning = getXpiInfoForSigning;

function sign(options, config) {
  config = _.assign({
    createXPI: xpi,
    AMOClient: DefaultAMOClient,
    getXpiInfoForSigning: getXpiInfoForSigning,
  }, config);

  options = _.assign({
    addonDir: process.cwd(),
    apiUrlPrefix: AMO_API_PREFIX,
  }, options);

  return when.promise(function(resolve, reject) {
    var missingOptions = [];
    var toCheck = [
      {value: options.apiKey, flag: "--api-key"},
      {value: options.apiSecret, flag: "--api-secret"},
    ];
    toCheck.forEach(function(opt) {
      if (!opt.value) {
        missingOptions.push(opt.flag);
      }
    });
    if (missingOptions.length) {
      console.error();
      missingOptions.forEach(function(flag) {
        console.error("  error: missing required option `%s'", flag);
      });
      console.error();
      return reject();
    }

    resolve(config.getXpiInfoForSigning({
      addonDir: options.addonDir,
      xpiPath: options.xpi,
    }));

  }).then(function(xpiInfo) {
    if (options.xpi) {
      logger.log("Signing XPI: " + options.xpi);
      return _.assign(xpiInfo, {xpiPath: options.xpi});
    } else {
      var createTmpDir = nodefn.lift(tmp.dir);
      return createTmpDir({
          prefix: "tmp-unsigned-xpi-",
          unsafeCleanup: true,
        })
        .then(function(tmpResult) {
          var tmpDir = tmpResult[0];
          var removeTmpDir = tmpResult[1];
          var xpiOptions = _.assign({}, options, {
            xpiPath: tmpDir,
          });

          return config.createXPI(xpiInfo.manifest, xpiOptions)
            .then(function(xpiPath) {
              logger.log("Created XPI for signing: " + xpiPath);
              return _.assign(xpiInfo, {
                xpiPath: xpiPath,
                cleanUp: removeTmpDir,
              });
            });
        });
    }
  }).then(function(xpiInfo) {

    if (!xpiInfo.id || !xpiInfo.version) {
      throw new Error(
          "Could not detect this XPI's ID and/or version\n\n" +
          "Troubleshooting:\n" +
          "- Are you in the right directory? If not, try --addon-dir\n" +
          "- Are you really in a directory of SDK add-on source? If not, try " +
             "signing with the --xpi option\n");
    }

    var client = new config.AMOClient({
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      apiUrlPrefix: options.apiUrlPrefix,
      debugLogging: options.verbose,
      signedStatusCheckTimeout: options.timeout || undefined,
    });
    return client.sign({
      xpiPath: xpiInfo.xpiPath,
      guid: xpiInfo.id,
      version: xpiInfo.version,
    }).then(function(result) {
      if (typeof xpiInfo.cleanUp !== "undefined") {
        client.debug("cleaning up XPI temp directory");
        xpiInfo.cleanUp();
      }
      return result;
    });

  });
}
exports.sign = sign;

function signCmd(program, options, config) {
  config = _.assign({
    systemProcess: process,
  }, config);
  return when.promise(function(resolve, reject) {
    resolve(cmd.validateProgram(program));
  }).then(function() {
    return sign(_.assign({}, options, program), config);
  }).then(function(result) {
    logger.log(result.success ? "SUCCESS" : "FAIL");
    config.systemProcess.exit(result.success ? 0 : 1);
  }).catch(function(err) {
    logger.error("FAIL");
    if (err) {
      console.error(err.stack);
    }
    config.systemProcess.exit(1);
  });
}
exports.signCmd = signCmd;
