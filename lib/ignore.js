/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var fs = require("fs-promise");
var when = require("when");
var Minimatch = require("minimatch").Minimatch;
var utils  = require("./utils");
var getManifest = utils.getManifest;
var console = utils.console;
var getID = require("jetpack-id");

/**
 * look for .jpmignore in the given directory and use it to filter files and sub-directories
 * fallback to use default filter rules if .jpmignore doesn't exist
 *
 * @param {String} dir
 * @param {Object} options
 * @return {Promise}
 */
function ignore (dir, options) {
  var jpmignore = path.join(dir, ".jpmignore");
  var default_rules = ["*.zip", ".*", "test/", ".jpmignore"];
  return getManifest()
  .then(function(manifest) {
    // add the xpi file name to the ignore list
    var xpiName = getID(manifest) + "*.xpi";
    default_rules.push(xpiName);
    return fs.exists(jpmignore);
  })
  .then(function (exists) {
    if (exists) {
      if (options.verbose) {
        console.log(".jpmignore found");
      }
      return fs.stat(jpmignore)
      .then(function (stat) {
        if (stat.isFile()) {
          return fs.readFile(jpmignore)
          .then(function (data) {
            return data.toString().replace(/[\r\n]/, "\n").split("\n");
          });
        }
        else {
          console.warn(".jpmignore is not a file, fallback to use default filter rules");
          return default_rules;
        }
      });
    }
    else {
      if (options.verbose) {
        console.warn(".jpmignore does not exist, fallback to use default filter rules");
      }
      return default_rules;
    }
  })
  .then(function (lines) {
    var rules = lines.filter(function (e) {
      // exclude blank lines and comments
      return !/^\s*(#|$)/.test(e);
    });
    // http://git-scm.com/docs/gitignore
    // the last matching pattern decides the outcome
    // reverse rules and break at first matched rule when filtering
    return rules.reverse().map(function (rule) {
      return new Minimatch(rule, { matchBase: true, dot: true, flipNegate: true });
    });
  })
  .then(function (rules) {
    return listdir(dir, rules, dir, true);
  });
}
module.exports = ignore;

/**
 * filter a dir based on filter rules
 *
 * @param {String}  dir
 * @param {Array}   rules
 * @param {Array}   root
 * @param {Boolean} included
 * @return {Promise}
 */
function listdir (dir, rules, root, included) {
  return fs.readdir(dir)
  .then(function (files) {
    return when.all(files.map(function (f) {
      f = path.join(dir, f);
      return when(fs.stat(f), function (stat) {
        return {
          path: f,
          isDirectory: stat.isDirectory()
        };
      });
    }));
  })
  .then(function (arr) {
    var files = [];
    var subdirs = [];
    arr.forEach(function (e) {
      e.isDirectory ? subdirs.push(e.path) : files.push(e.path);
    });
    files = files.filter(function (f) {
      return filter(f, rules, root, false, included);
    });
    return when.all(subdirs.map(function (d) {
      return listdir(d, rules, root, filter(d, rules, root, true, included));
    }))
    .then(function (list) {
      list = list.reduce(function (ret, i) {
        return ret.concat(i);
      }, files);
      // include current dir only if at least one of its children is included
      if (list.length > 0) {
        list.push(dir);
      }
      return list;
    });
  })
}

/**
 * check if a given file or dir should be kept
 *
 * @param {String}  p
 * @param {Array}   rules
 * @param {String}  root
 * @param {Boolean} isDirectory
 * @param {Boolean} included
 * @return {Boolean}
 */
function filter (p, rules, root, isDirectory, included) {
  p = path.relative(root, p);
  for (var i in rules) {
    var rule = rules[i];
    if (isDirectory) {
      if (rule.match(p) || rule.match("/" + p) || rule.match(p + "/") || rule.match("/" + p + "/")) {
        return rule.negate;
      }
    }
    else {
      if (rule.match(p) || rule.match("/" + p)) {
        return rule.negate;
      }
    }
  }
  return included;
}
