/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var _ = require("lodash");
var chai = require("chai");
var expect = chai.expect;
var when = require("when");

var signCmd = require("../../lib/sign").signCmd;
var getXpiInfoForSigning = require("../../lib/sign").getXpiInfoForSigning;
var utils = require("../utils");
var testDir = path.join(__dirname, "..");
var simpleAddonPath = path.join(testDir, "fixtures", "simple-addon");

describe("sign", function() {
  var mockProcessExit;
  var mockProcess;
  var signAddonCall;

  beforeEach(function() {
    utils.setup();
    signAddonCall = null;
    mockProcessExit = new CallableMock();
    mockProcess = {
      exit: mockProcessExit.getCallable(),
    };
  });

  afterEach(utils.tearDown);

  function makeSignAddonCall(options) {
    options = _.assign({
      errorToThrow: null,
      result: {success: true},
    }, options);

    signAddonCall = new CallableMock({
      returnValue: when.promise(function(resolve) {
        if (options.errorToThrow) {
          throw options.errorToThrow;
        }
        resolve(options.result);
      }),
    });

    return signAddonCall;
  }

  function runSignCmd(options) {
    options = _.assign({
      getXpiInfoForSigning: null,
      createXPI: null,
      signAddon: makeSignAddonCall(),
      cmdOptions: {
        apiKey: "some-key",
        apiSecret: "some-secret",
        apiUrlPrefix: "https://fake.domain/api",
      },
      program: {
        addonDir: simpleAddonPath,
      },
    }, options);

    var cmdConfig = {
      systemProcess: mockProcess,
      signAddon: options.signAddon.getCallable(),
    };
    if (options.getXpiInfoForSigning !== null) {
      cmdConfig.getXpiInfoForSigning = options.getXpiInfoForSigning;
    }
    if (options.createXPI !== null) {
      cmdConfig.createXPI = options.createXPI;
    }

    return signCmd(options.program, options.cmdOptions, cmdConfig);
  }

  it("should exit 0 on signing success", function(done) {
    runSignCmd().then(function() {
      expect(signAddonCall.wasCalled).to.be.equal(true);
      expect(mockProcessExit.call[0]).to.be.equal(0);
      done();
    }).catch(done);
  });

  it("passes manifest info to the signer", function(done) {
    runSignCmd().then(function() {
      expect(signAddonCall.wasCalled).to.be.equal(true);
      // This checks that version/guid values from
      // the manifest (loaded from a fixture) are used.
      expect(signAddonCall.call[0].version).to.be.equal("1.0.0");
      expect(signAddonCall.call[0].id).to.be.equal("@simple-addon");
      done();
    }).catch(done);
  });

  it("passes API configuration to the signer", function(done) {
    runSignCmd().then(function() {
      expect(signAddonCall.wasCalled).to.be.equal(true);
      expect(signAddonCall.call[0].apiKey).to.be.equal("some-key");
      expect(signAddonCall.call[0].apiSecret).to.be.equal("some-secret");
      expect(signAddonCall.call[0].apiUrlPrefix).to.be.equal("https://fake.domain/api");
      done();
    }).catch(done);
  });

  it("passes addonDir to XPI creator", function(done) {
    var mockXPICreator = new CallableMock({
      returnValue: when.promise(function(resolve) {
        resolve({});
      }),
    });
    runSignCmd({
      createXPI: mockXPICreator.getCallable(),
      program: {
        addonDir: "/nowhere/stub/xpi/path",
      }
    }).then(function() {
      expect(mockXPICreator.call[1].addonDir).to.be.equal("/nowhere/stub/xpi/path");
      done();
    }).catch(done);
  });

  it("creates XPI in tmp directory", function(done) {
    var mockXPICreator = new CallableMock({
      returnValue: when.promise(function(resolve) {
        resolve({});
      }),
    });
    runSignCmd({
      createXPI: mockXPICreator.getCallable(),
      program: {
        addonDir: "/nowhere/stub/xpi/path",
      }
    }).then(function() {
      expect(mockXPICreator.call[1].xpiPath).to.include("tmp-unsigned-xpi-");
      done();
    }).catch(done);
  });

  it("can turn on debug logging", function(done) {
    var mockXPICreator = new CallableMock({
      returnValue: when.promise(function(resolve) {
        resolve({});
      }),
    });
    runSignCmd({
      createXPI: mockXPICreator.getCallable(),
      program: {
        verbose: true,
        addonDir: simpleAddonPath,
      },
    }).then(function() {
      expect(signAddonCall.call[0].verbose).to.be.equal(true);
      done();
    }).catch(done);
  });

  it("can configure polling timeouts", function(done) {
    runSignCmd({
      cmdOptions: {
        apiKey: "some-key",
        apiSecret: "some-secret",
        timeout: 5000,
      },
    }).then(function() {
      expect(signAddonCall.call[0].timeout)
        .to.be.equal(5000);
      done();
    }).catch(done);
  });

  it("passes custom XPI to the signer", function(done) {
    var mockXpiInfoGetter = new CallableMock({
      returnValue: when.promise(function(resolve) {
        resolve({
          id: "some-id",
          version: "0.0.1",
        });
      }),
    });
    // Make sure nothing is checking the working directory for add-on
    // things.
    process.chdir(path.join(__dirname, "..", "addons"));
    runSignCmd({
      getXpiInfoForSigning: mockXpiInfoGetter.getCallable(),
      cmdOptions: {
        xpi: "/some/path/to/file.xpi",
        apiKey: "some-key",
        apiSecret: "some-secret",
      },
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(0);
      expect(mockXpiInfoGetter.call[0].xpiPath)
        .to.be.equal("/some/path/to/file.xpi");
      expect(signAddonCall.wasCalled).to.be.equal(true);
      expect(signAddonCall.call[0].xpiPath)
        .to.be.equal("/some/path/to/file.xpi");
      done();
    }).catch(done);
  });

  it("should exit 1 on signing failure", function(done) {
    runSignCmd({
      signAddon: makeSignAddonCall({
        result: {success: false},
      }),
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(1);
      done();
    }).catch(done);
  });

  it("exits 1 when id/version cannot be detected", function(done) {
    var mockXpiInfoGetter = new CallableMock({
      returnValue: when.promise(function(resolve) {
        // Resolve an empty XPI info object which will happen
        // in various scenarios when id/version cannot be detected.
        resolve({});
      }),
    });
    runSignCmd({
      getXpiInfoForSigning: mockXpiInfoGetter.getCallable(),
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(1);
      done();
    }).catch(done);
  });

  it("should exit 1 on exception", function(done) {
    runSignCmd({
      signAddon: makeSignAddonCall({
        errorToThrow: new Error("some signing error"),
      }),
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(1);
      done();
    }).catch(done);
  });

  it("should exit early for missing --api-key", function(done) {
    runSignCmd({
      cmdOptions: {
        // missing apiKey.
        apiSecret: "secret",
      },
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(1);
      expect(signAddonCall.wasCalled).to.be.equal(false);
      done();
    }).catch(done);
  });

  it("should exit early for missing --api-secret", function(done) {
    runSignCmd({
      cmdOptions: {
        apiKey: "some-key",
        // missing apiSecret.
      },
    }).then(function() {
      expect(mockProcessExit.call[0]).to.be.equal(1);
      expect(signAddonCall.wasCalled).to.be.equal(false);
      done();
    }).catch(done);
  });

  describe("getXpiInfoForSigning", function() {
    var simpleAddonXPI = path.join(testDir, "xpis", "@simple-addon.xpi");
    var installRdfXpi = path.join(testDir, "xpis", "install-rdf.xpi");

    it("gets info from an SDK add-on", function() {
      return getXpiInfoForSigning({xpiPath: simpleAddonXPI})
        .then(function(xpiInfo) {
          expect(xpiInfo.version).to.be.equal("1.0.0");
          expect(xpiInfo.id).to.be.equal("@simple-addon");
        });
    });

    it("gets info from current jetpack", function() {
      return getXpiInfoForSigning({addonDir: simpleAddonPath})
        .then(function(xpiInfo) {
          expect(xpiInfo.version).to.be.equal("1.0.0");
          expect(xpiInfo.id).to.be.equal("@simple-addon");
        });
    });

    it("gets info from install.rdf in non-SDK XPIs", function() {
      return getXpiInfoForSigning({xpiPath: installRdfXpi})
        .then(function(xpiInfo) {
          expect(xpiInfo.version).to.be.equal("2.1.106");
          expect(xpiInfo.id)
            .to.be.equal("{2fa4ed95-0317-4c6a-a74c-5f3e3912c1f9}");
        });
    });
  });
});

function CallableMock(conf) {
  conf = _.assign({
    returnValue: undefined,
  }, conf);
  this.call = null;
  this.wasCalled = false;
  this.returnValue = conf.returnValue;
}

CallableMock.prototype._call = function() {
  this.call = arguments;
  this.wasCalled = true;
  return this.returnValue;
};

CallableMock.prototype.getCallable = function() {
  return this._call.bind(this);
};
