/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var getID = require("jetpack-id");
var tmp = require("tmp");
var nodefn = require("when/node");
var when = require("when");

var DefaultAMOClient = require("./amo-client").Client;
var cmd = require("./cmd");
var utils = require("./utils");
var logger = utils.console;
var xpi = require("./xpi");


function sign (program, options, config) {
  config = _.assign({
    createXPI: xpi,
    getManifest: utils.getManifest,
    systemProcess: process,
    AMOClient: DefaultAMOClient,
  }, config);

  return when.promise(function(resolve, reject) {
    var missingOptions = [];
    var toCheck = [
      {value: options.apiKey, flag: '--api-key'},
      {value: options.apiSecret, flag: '--api-secret'},
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
    cmd.validateProgram(program);

    resolve(config.getManifest({
      addonDir: program.addonDir,
      xpiPath: options.xpi,
    }));

  }).then(function (manifest) {
    var xpiConfig = {
      manifest: manifest,
    };
    if (options.xpi) {
      logger.log("Signing XPI: " + options.xpi);
      return _.assign(xpiConfig, {xpiPath: options.xpi});
    } else {
      var createTmpDir = nodefn.lift(tmp.dir);
      return createTmpDir({
          prefix: 'tmp-unsigned-xpi-',
          unsafeCleanup: true,
        })
        .then(function(tmpResult) {
          var tmpDir = tmpResult[0];
          var removeTmpDir = tmpResult[1];
          // Merge the program and sub-command options.
          var xpiOptions = _.assign({}, program, options, {
            xpiPath: tmpDir,
          });
          return config.createXPI(manifest, xpiOptions)
            .then(function(xpiPath) {
              logger.log("Created XPI for signing: " + xpiPath);
              return _.assign(xpiConfig, {
                xpiPath: xpiPath,
                cleanUp: removeTmpDir,
              });
            });
        });
    }
  }).then(function (xpiConfig) {

    var client = new config.AMOClient({
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      apiUrlPrefix: options.apiUrlPrefix,
      debugLogging: program.verbose,
    });
    return client.sign({
      xpiPath: xpiConfig.xpiPath,
      guid: getID(xpiConfig.manifest),
      version: xpiConfig.manifest.version,
    }).then(function(result) {
      if (typeof xpiConfig.cleanUp !== 'undefined') {
        client.debug('cleaning up XPI temp directory');
        xpiConfig.cleanUp();
      }
      return result;
    });

  }).then(function(result) {
    logger.log(result.success ? 'SUCCESS' : 'FAIL');
    config.systemProcess.exit(result.success ? 0 : 1);
  }, function (err) {
    logger.error('FAIL');
    if (err) {
      console.error(err.stack);
    }
    config.systemProcess.exit(1);
  });
}


module.exports = sign;
