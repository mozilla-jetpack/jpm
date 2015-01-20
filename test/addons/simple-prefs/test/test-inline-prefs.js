/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { Cu } = require('chrome');
const sp = require('sdk/simple-prefs');
const app = require('sdk/system/xul-app');
const self = require('sdk/self');
const { preferencesBranch } = self;
const { getTabForId, openTab, getBrowserForTab, getTabId } = require('sdk/tabs/utils');
const { Tab } = require('sdk/tabs/tab');
const { on, off } = require("sdk/system/events");
const { getMostRecentBrowserWindow } = require('sdk/window/utils');
require('sdk/tabs');

const { AddonManager } = Cu.import('resource://gre/modules/AddonManager.jsm', {});

// Opens about:addons in a new tab, then displays the inline
// preferences of the provided add-on
const open = ({ id }) => new Promise((resolve, reject) => {
  // opening the about:addons page in a new tab
  let tab = openTab(getMostRecentBrowserWindow(), "about:addons");
  let browser = getBrowserForTab(tab);

  // waiting for the about:addons page to load
  browser.addEventListener("load", function onPageLoad() {
    browser.removeEventListener("load", onPageLoad, true);
    let window = browser.contentWindow;

    // wait for the add-on's "addon-options-displayed"
    on("addon-options-displayed", function onPrefDisplayed({ subject: doc, data }) {
      if (data === id) {
        off("addon-options-displayed", onPrefDisplayed);
        resolve({
          id: id,
          tabId: getTabId(tab),
          "document": doc
        });
      }
    }, true);

    // display the add-on inline preferences page
    window.gViewController.commands.cmd_showItemDetails.doCommand({ id: id }, true);
  }, true);
});

exports.testDefaultValues = function (assert) {
  assert.equal(sp.prefs.myHiddenInt, 5, 'myHiddenInt default is 5');
  assert.equal(sp.prefs.myInteger, 8, 'myInteger default is 8');
  assert.equal(sp.prefs.somePreference, 'TEST', 'somePreference default is correct');
}

exports.testOptionsType = function(assert, done) {
  AddonManager.getAddonByID(self.id, function(aAddon) {
    assert.equal(aAddon.optionsType, AddonManager.OPTIONS_TYPE_INLINE, 'options type is inline');
    done();
  });
}

exports.testButton = function(assert, done) {
  open(self).then(({ tabId, document }) => {
    let tab = Tab({ tab: getTabForId(tabId) });
    sp.once('sayHello', _ => {
      assert.pass('The button was pressed!');
      tab.close(done);
    });

    tab.attach({
      contentScript: 'unsafeWindow.document.querySelector("button[label=\'Click me!\']").click();'
    });
  });
}

if (app.is('Firefox')) {
  exports.testAOM = function(assert, done) {
    open(self).then(({ tabId }) => {
      let tab = Tab({ tab: getTabForId(tabId) });
      assert.pass('the add-on prefs page was opened.');

      tab.attach({
        contentScriptWhen: "end",
        contentScript: 'self.postMessage({\n' +
                         'someCount: unsafeWindow.document.querySelectorAll("setting[title=\'some-title\']").length,\n' +
                         'somePreference: getAttributes(unsafeWindow.document.querySelector("setting[title=\'some-title\']")),\n' +
                         'myInteger: getAttributes(unsafeWindow.document.querySelector("setting[title=\'my-int\']")),\n' +
                         'myHiddenInt: getAttributes(unsafeWindow.document.querySelector("setting[title=\'hidden-int\']")),\n' +
                         'sayHello: getAttributes(unsafeWindow.document.querySelector("button[label=\'Click me!\']"))\n' +
                       '});\n' +
                       'function getAttributes(ele) {\n' +
                         'if (!ele) return {};\n' +
                         'return {\n' +
                           'pref: ele.getAttribute("pref"),\n' +
                           'type: ele.getAttribute("type"),\n' +
                           'title: ele.getAttribute("title"),\n' +
                           'desc: ele.getAttribute("desc"),\n' +
                           '"data-jetpack-id": ele.getAttribute(\'data-jetpack-id\')\n' +
                         '}\n' +
                       '}\n',
        onMessage: msg => {
          // test against doc caching
          assert.equal(msg.someCount, 1, 'there is exactly one <setting> node for somePreference');

          // test somePreference
          assert.equal(msg.somePreference.type, 'string', 'some pref is a string');
          assert.equal(msg.somePreference.pref, 'extensions.'+self.id+'.somePreference', 'somePreference path is correct');
          assert.equal(msg.somePreference.title, 'some-title', 'somePreference title is correct');
          assert.equal(msg.somePreference.desc, 'Some short description for the preference', 'somePreference description is correct');
          assert.equal(msg.somePreference['data-jetpack-id'], self.id, 'data-jetpack-id attribute value is correct');

          // test myInteger
          assert.equal(msg.myInteger.type, 'integer', 'myInteger is a int');
          assert.equal(msg.myInteger.pref, 'extensions.'+self.id+'.myInteger', 'extensions.test-simple-prefs.myInteger');
          assert.equal(msg.myInteger.title, 'my-int', 'myInteger title is correct');
          assert.equal(msg.myInteger.desc, 'How many of them we have.', 'myInteger desc is correct');
          assert.equal(msg.myInteger['data-jetpack-id'], self.id, 'data-jetpack-id attribute value is correct');

          // test myHiddenInt
          assert.equal(msg.myHiddenInt.type, undefined, 'myHiddenInt was not displayed');
          assert.equal(msg.myHiddenInt.pref, undefined, 'myHiddenInt was not displayed');
          assert.equal(msg.myHiddenInt.title, undefined, 'myHiddenInt was not displayed');
          assert.equal(msg.myHiddenInt.desc, undefined, 'myHiddenInt was not displayed');

          // test sayHello
          assert.equal(msg.sayHello['data-jetpack-id'], self.id, 'data-jetpack-id attribute value is correct');

          tab.close(done);
        }
      });
    })
  }

  // run it again, to test against inline options document caching
  // and duplication of <setting> nodes upon re-entry to about:addons
  exports.testAgainstDocCaching = exports.testAOM;

}

exports.testDefaultPreferencesBranch = function(assert) {
  assert.equal(preferencesBranch, self.id, 'preferencesBranch default the same as self.id');
}

require('sdk/test').run(exports);
