/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var merge = require("lodash.merge");
var deepcopy = require("deepcopy");
var fs = require("fs");
var url = require("url");
var path = require("path");
var jwt = require("jsonwebtoken");
var request = require("request");
var when = require("when");
var nodefn = require("when/node");
var defaultLogger = require("./utils").console;

/**
 * Construct a new addons.mozilla.org API client.
 *
 * @param {Object} conf
 *   - `apiKey`: API key string from the Developer Hub.
 *   - `apiSecret`: API secret string from the Developer Hub.
 *   - `apiUrlPrefix`: API URL prefix, including any leading paths.
 *   - `signedStatusCheckInterval`: A period in millesconds between
 *     checks when waiting on add-on signing.
 *   - `signedStatusCheckTimeout`: A length in millesconds to give up
 *      if the add-on hasn't been signed.
 *   - `debugLogging`: When true, log more information
 */
function Client(conf) {
  conf = merge({
    debugLogging: false,
    signedStatusCheckInterval: 1000,
    signedStatusCheckTimeout: 120000,  // 2 minutes.
    // For some reason, merge won't let us replace logger methods
    // (for testing) unless it's a plain object:
    logger: _.assign({}, defaultLogger),
  }, conf);
  this.apiKey = conf.apiKey;
  this.apiSecret = conf.apiSecret;
  this.apiUrlPrefix = conf.apiUrlPrefix;  // default set in CLI options.
  this.signedStatusCheckInterval = conf.signedStatusCheckInterval;
  this.signedStatusCheckTimeout = conf.signedStatusCheckTimeout;
  this.debugLogging = conf.debugLogging;
  this.logger = conf.logger;

  // Set up external dependencies, allowing for overrides.
  this._validateProgress = conf.validateProgress || new PseudoProgress({
    preamble: "Validating add-on",
  });
  this._fs = conf.fs || fs;
  this._request = conf.request || request;
}

/**
 * Sign a new version of your add-on at addons.mozilla.org.
 *
 * @param {Object} conf
 *   - `xpiPath` Path to xpi file.
 *   - `guid` add-on GUID, aka the ID in install.rdf.
 *   - `version` add-on version string.
 * @return {Promise}
 */
Client.prototype.sign = function(conf) {
  var self = this;
  conf = conf || {};

  var addonUrl = "/addons/" + encodeURIComponent(conf.guid);
  addonUrl += "/versions/" + encodeURIComponent(conf.version) + "/";

  return this.put({
    url: addonUrl,
    formData: {
      upload: this._fs.createReadStream(conf.xpiPath),
    },
  }, {
    throwOnBadResponse: false,
  }).then(function(responseResult) {
    var httpResponse = responseResult[0] || {};
    var response = responseResult[1];

    var acceptableStatuses = [200, 201, 202];
    if (acceptableStatuses.indexOf(httpResponse.statusCode) === -1) {
      if (typeof response === "object" && response.error) {
        self.logger.error("Server response:", response.error,
                          "( status:", httpResponse.statusCode, ")");
        return {success: false};
      }

      throw new Error(
        "Received bad response from the server while requesting " +
        self.absoluteURL(addonUrl) +
        "\n\n" + "status: " + httpResponse.statusCode + "\n" +
        "response: " + formatResponse(response) + "\n" + "headers: " +
        JSON.stringify(httpResponse.headers || {}) + "\n");
    }

    return self.waitForSignedAddon(response.url);
  });
};

/**
 * Poll a status URL, waiting for the queued add-on to be signed.
 *
 * @param {String} URL to GET for add-on status.
 * @return {Promise}
 */
Client.prototype.waitForSignedAddon = function(statusUrl, opt) {
  var self = this;
  var lastStatusResponse;

  opt = _.assign({
    clearTimeout: clearTimeout,
    setAbortTimeout: setTimeout,
    setStatusCheckTimeout: setTimeout,
    abortAfter: self.signedStatusCheckTimeout,
  }, opt);

  return when.promise(function(resolve, reject) {
    self._validateProgress.animate();
    var statusCheckTimeout;
    var nextStatusCheck;

    function checkSignedStatus() {
      self.get({url: statusUrl}).then(function(result) {
        var data = result[1];
        lastStatusResponse = data;

        // TODO: remove this when the API has been fully deployed with this
        // change: https://github.com/mozilla/olympia/pull/1041
        var apiReportsAutoSigning = typeof data.automated_signing !==
            "undefined";

        var canBeAutoSigned = data.automated_signing;
        var failedValidation = !data.valid;
        // The add-on passed validation and all files have been created.
        // There are many checks for this state because the data will be
        // updated incrementally by the API server.
        var signedAndReady = data.valid && data.active && data.reviewed &&
                             data.files && data.files.length > 0;
        // The add-on is valid but requires a manual review before it can
        // be signed.
        var requiresManualReview = data.valid && apiReportsAutoSigning &&
                                   !canBeAutoSigned;

        if (data.processed &&
              (failedValidation || signedAndReady || requiresManualReview)) {

          self._validateProgress.finish();
          opt.clearTimeout(statusCheckTimeout);
          self.logger.log("Validation results:", data.validation_url);

          if (requiresManualReview) {
            self.logger.log(
              "Your add-on has been submitted for review. It passed " +
              "validation but could not be automatically signed " +
              "because this is a listed add-on.");
            return resolve({success: false});
          } else if (signedAndReady) {
            // TODO: show some validation warnings if there are any.
            // We should show things like "missing update URL in install.rdf"
            return resolve(self.downloadSignedFiles(data.files));
          } else {
            self.logger.log(
              "Your add-on failed validation and could not be signed");
            return resolve({success: false});
          }

        } else {
          // The add-on has not been fully processed yet.
          nextStatusCheck = opt.setStatusCheckTimeout(
              checkSignedStatus, self.signedStatusCheckInterval);
        }
      });
    }

    checkSignedStatus();

    statusCheckTimeout = opt.setAbortTimeout(function() {
      self._validateProgress.finish();
      opt.clearTimeout(nextStatusCheck);
      reject(new Error(
          "Validation took too long to complete; last status: " +
          formatResponse(lastStatusResponse || "[null]")));

    }, opt.abortAfter);

  });
};

/**
 * Download the signed files.
 *
 * @param {Array} Array of file objects returned from the API.
 *                Each object needs to have these parameters:
 *                  - `download_url` - the URL to the file
 * @return {Promise}
 */
Client.prototype.downloadSignedFiles = function(signedFiles, options) {
  options = _.assign({
    createWriteStream: fs.createWriteStream,
    request: this._request,
    stdout: process.stdout,
  }, options);
  var self = this;
  var allDownloads = [];
  var dataExpected = null;
  var dataReceived = 0;

  function showProgress() {
    var progress = "...";
    if (dataExpected !== null) {
      var amount = ((dataReceived / dataExpected) * 100).toFixed();
      // Pad the percentage amount so that the line length is consistent.
      // This should do something like '  0%', ' 25%', '100%'
      var padding = "";
      try {
        padding = Array(4 - amount.length).join(" ");
      } catch (e) {
        // Ignore Invalid array length and such.
      }
      progress = padding + amount + "% ";
    }
    options.stdout.write("\r" +
        "Downloading signed files: " + progress);
  }

  function download(fileUrl) {
    return when.promise(function(resolve, reject) {
      // The API will give us a signed file named in a sane way.
      var fileName = path.join(process.cwd(), getUrlBasename(fileUrl));
      var out = options.createWriteStream(fileName);

      options.request(self.configureRequest({
          method: "GET",
          url: fileUrl,
          followRedirect: true,
        }))
        .on("error", reject)
        .on("response", function(data) {
          var contentLength = data.headers["content-length"];
          if (contentLength) {
            dataExpected += parseInt(contentLength);
          }
        })
        .on("data", function(chunk) {
          dataReceived += chunk.length;
          showProgress();
        })
        .pipe(out)
        .on("error", reject);

      out.on("finish", function() {
        options.stdout.write("\n");  // end the progress output
        resolve(fileName);
      });
    });
  }

  // TODO: handle 404 downloads

  return when.promise(function(resolve, reject) {
    var foundUnsignedFiles = false;
    signedFiles.forEach(function(file) {
      if (file.signed) {
        allDownloads.push(download(file.download_url));
      } else {
        self.debug("This file was not signed:", file);
        foundUnsignedFiles = true;
      }
    });

    if (allDownloads.length) {
      if (foundUnsignedFiles) {
        self.logger.log(
          "Some files were not signed. Re-run with --verbose for details.");
      }
      showProgress();
      resolve(when.all(allDownloads));
    } else {
      reject(new Error(
        "The XPI was processed but no signed files were found. Check your " +
        "manifest and make sure it targets Firefox as an application."));
    }

  }).then(function(downloadedFiles) {
    self.logger.log("Downloaded:");
    downloadedFiles.forEach(function(fileName) {
      self.logger.log("    " + fileName.replace(process.cwd(), "."));
    });
    return {
      success: true,
      downloadedFiles: downloadedFiles,
    };
  });
};

/**
 * Make a GET request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.get = function() {
  return this.request.apply(
    this, ["get"].concat(Array.prototype.slice.call(arguments)));
};

/**
 * Make a POST request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.post = function() {
  return this.request.apply(
    this, ["post"].concat(Array.prototype.slice.call(arguments)));
};

/**
 * Make a PUT request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.put = function() {
  return this.request.apply(
    this, ["put"].concat(Array.prototype.slice.call(arguments)));
};

/**
 * Make a PATCH request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype.patch = function() {
  return this.request.apply(
    this, ["patch"].concat(Array.prototype.slice.call(arguments)));
};

/**
 * Make a DELETE request.
 *
 * @param {Object} conf, as accepted by the `request` module.
 * @param {Object} options, as accepted by `this.request()`.
 * @return {Promise}
 */
Client.prototype["delete"] = function() {
  return this.request.apply(
    this, ["delete"].concat(Array.prototype.slice.call(arguments)));
};

/**
 * Returns a URL that is guaranteed to be absolute.
 *
 * @param {String} a relative or already absolute URL
 * @return {String} an absolute URL, prefixed by the API prefix if necessary.
 */
Client.prototype.absoluteURL = function(url) {
  if (!url.match(/^http/i)) {
    url = this.apiUrlPrefix + url;
  }
  return url;
};

/**
 * Configures a request with defaults such as authentication headers.
 *
 * @param {Object} requestConf as accepted by the `request` module.
 * @return {Object} new requestConf object suitable
 *                  for `request(conf)`, `request.get(conf)`, etc.
 */
Client.prototype.configureRequest = function(requestConf) {
  requestConf = _.assign({}, requestConf);
  if (!requestConf.url) {
    throw new Error("request URL was not specified");
  }
  requestConf.url = this.absoluteURL(requestConf.url);

  var authToken = jwt.sign({iss: this.apiKey}, this.apiSecret, {
    algorithm: "HS256",
    expiresIn: 60,
  });

  requestConf.headers = _.assign({
    Authorization: "JWT " + authToken,
    Accept: "application/json",
  }, requestConf.headers);

  return requestConf;
};

/**
 * Make any HTTP request to the addons.mozilla.org API.
 *
 * This includes the necessary authorization header.
 *
 * @param {String} method - HTTP method name.
 * @param {Object} requestConf as accepted by the `request` module.
 * @param {Object} options.
 *  - `throwOnBadResponse` - if true, an error will be thrown when not
 *                           response status is not 2xx
 *
 * The returned promise will be resolved with an array of arguments
 * that match the arguments sent to the callback as specified in the
 * `request` module.
 *
 * @return {Promise}
 */
Client.prototype.request = function(method, requestConf, options) {
  method = method.toLowerCase();
  var self = this;
  return when.promise(function(resolve, reject) {
    requestConf = self.configureRequest(requestConf);
    self.debug("[API] ->", requestConf);

    options = _.assign({
      throwOnBadResponse: true,
    }, options);

    // Get the caller, like request.get(), request.put() ...
    var requestMethod = self._request[method].bind(self._request);
    // Wrap the request callback in a promise. Here is an example without
    // promises:
    //
    // request.put(requestConf, function(err, httpResponse, body) {
    //   // promise gets resolved here
    // })
    //
    resolve(nodefn.call(requestMethod, requestConf));

  }).then(function(responseResult) {
    var httpResponse = responseResult[0];
    var body = responseResult[1];

    if (options.throwOnBadResponse) {
      if (httpResponse.statusCode > 299 || httpResponse.statusCode < 200) {
        throw new Error(
          "Received bad response from " +
          self.absoluteURL(requestConf.url) + "; " +
          "status: " + httpResponse.statusCode + "; " +
          "response: " + formatResponse(body));
      }
    }

    if (
      httpResponse.headers &&
        httpResponse.headers["content-type"] === "application/json" &&
        typeof body === "string"
    ) {
      try {
        body = JSON.parse(body);
      } catch (e) {
        self.logger.log("Failed to parse JSON response from server:", e);
      }
    }
    self.debug("[API] <-",
               {headers: httpResponse.headers, response: body});

    return [httpResponse, body];
  });
};

/**
 * Output some debugging info if this instance is configured for it.
 */
Client.prototype.debug = function() {
  if (!this.debugLogging) {
    return;
  }

  function redact(obj) {
    if (typeof obj !== "object" || !obj) {
      return obj;
    }
    if (obj.headers) {
      ["Authorization", "cookie", "set-cookie"].forEach(function(hdr) {
        if (obj.headers[hdr]) {
          obj.headers[hdr] = "<REDACTED>";
        }
      });
    }
    Object.keys(obj).forEach(function(key) {
      obj[key] = redact(obj[key]);
    });
    return obj;
  }

  var args = Array.prototype.map.call(arguments, function(val) {
    if (typeof val === "object") {
      val = deepcopy(val);
      val = redact(val);
    }
    return val;
  });
  this.logger.debug.apply(this.logger, args);
};

/**
 * A pseudo progress indicator.
 *
 * This is just a silly shell animation that was meant to simulate how lots of
 * tests would be run on an add-on file. It sort of looks like a torrent file
 * randomly getting filled in.
 */
function PseudoProgress(conf) {
  conf = _.assign({
    preamble: "",
    setInterval: setInterval,
    clearInterval: clearInterval,
    stdout: process.stdout,
  }, conf);

  this.bucket = [];
  this.interval = null;
  this.motionCounter = 1;

  this.preamble = conf.preamble;
  this.preamble += " [";
  this.addendum = "]";
  this.setInterval = conf.setInterval;
  this.clearInterval = conf.clearInterval;
  this.stdout = conf.stdout;

  var shellWidth = 80;
  if (this.stdout.isTTY) {
    shellWidth = this.stdout.columns;
  }

  this.emptyBucketPointers = [];
  var bucketSize = shellWidth - this.preamble.length - this.addendum.length;
  for (var i = 0; i < bucketSize; i++) {
    this.bucket.push(" ");
    this.emptyBucketPointers.push(i);
  }
}

PseudoProgress.prototype.animate = function(conf) {
  conf = _.assign({
    speed: 100,
  }, conf);
  var self = this;
  var bucketIsFull = false;
  this.interval = this.setInterval(function() {
    if (bucketIsFull) {
      self.moveBucket();
    } else {
      bucketIsFull = self.randomlyFillBucket();
    }
  }, conf.speed);
};

PseudoProgress.prototype.finish = function() {
  this.clearInterval(this.interval);
  this.fillBucket();
};

PseudoProgress.prototype.randomlyFillBucket = function() {
  // randomly fill a bucket (the width of the shell) with dots.
  var self = this;
  var randomIndex = Math.floor(Math.random() *
                               this.emptyBucketPointers.length);
  var pointer = this.emptyBucketPointers[randomIndex];
  this.bucket[pointer] = ".";

  this.showBucket();

  var isFull = true;
  var newPointers = [];
  this.emptyBucketPointers.forEach(function(pointer) {
    if (self.bucket[pointer] === " ") {
      isFull = false;
      newPointers.push(pointer);
    }
  });
  this.emptyBucketPointers = newPointers;

  return isFull;
};

PseudoProgress.prototype.fillBucket = function() {
  // fill the whole bucket with dots to indicate completion.
  this.bucket = this.bucket.map(function() {
    return ".";
  });
  this.showBucket();
};

PseudoProgress.prototype.moveBucket = function() {
  // animate dots moving in a forward motion.
  for (var i = 0; i < this.bucket.length; i++) {
    this.bucket[i] = ((i - this.motionCounter) % 3) ? " " : ".";
  }
  this.showBucket();

  this.motionCounter ++;
};

PseudoProgress.prototype.showBucket = function() {
  this.stdout.write("\r" + this.preamble + this.bucket.join("") +
                    this.addendum);
};

/**
 * Returns a nicely formatted HTTP response.
 *
 * This makes the response suitable for logging.
 * */
function formatResponse(response, options) {
  options = _.assign({
    maxLength: 500,
  }, options);
  var prettyResponse = response;
  if (typeof prettyResponse === "object") {
    try {
      prettyResponse = JSON.stringify(prettyResponse);
    } catch (e) {}
  }
  if (typeof prettyResponse === "string") {
    if (prettyResponse.length > options.maxLength) {
      prettyResponse = prettyResponse.substring(0, options.maxLength) + "...";
    }
  }
  return prettyResponse.toString();
}

/**
 * Returns the basename of a URL, suitable for saving to disk.
 * */
function getUrlBasename(absUrl) {
  var urlPath = path.basename(url.parse(absUrl).path);
  var parts = urlPath.split("?");
  return parts[0];
}

exports.Client = Client;
exports.PseudoProgress = PseudoProgress;
exports.formatResponse = formatResponse;
exports.getUrlBasename = getUrlBasename;
