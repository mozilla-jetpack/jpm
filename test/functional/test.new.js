/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require("fs");
var utils = require("../utils");
var path = require("path");
var exec = utils.exec;
var respond = utils.respond;
var generateResponses = utils.generateResponses;
var chai = require("chai");
var expect = chai.expect;
var when = require("when");

describe("jpm new", function () {
    beforeEach(utils.setup);
    afterEach(utils.tearDown);

    it("does not create a new addon if no name is given", function (done) {
        var proc = exec("new", {}, function (err, stdout, stderr) {
            expect(stderr).to.contain("requires a name");
            done();
        });
    });

    it("does not create a new addon if name is `.`", function (done) {
        var proc = exec("new .", {}, function (err, stdout, stderr) {
            expect(stderr).to.contain("Use `jpm init` instead");
            done();
        });
    });

    it("creates an addon called `name` in a new folder", function (done) {
        process.chdir(utils.tmpOutputDir);
        var responses = generateResponses();

        var proc = respond(exec("new jetpack"), responses);
        proc.on("close", function() {
            expect(fs.existsSync(path.join(utils.tmpOutputDir, "jetpack")))
              .to.equal(true);
            expect(fs.existsSync(path.join(utils.tmpOutputDir, "jetpack/package.json")))
              .to.equal(true);
            done();
        });
        proc.once("exit", function(code) {
            expect(code).to.equal(0);
        });
    });
});
