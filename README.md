JPM [![Dependency Status](https://david-dm.org/mozilla-jetpack/jpm.png)](https://david-dm.org/mozilla-jetpack/jpm) [![Build Status](https://travis-ci.org/mozilla-jetpack/jpm.png)](https://travis-ci.org/mozilla-jetpack/jpm)
===

[![NPM](https://nodei.co/npm/jpm.png?stars&downloads)](https://nodei.co/npm/jpm/)
[![NPM](https://nodei.co/npm-dl/jpm.png)](https://nodei.co/npm/jpm)

**IMPORTANT UPDATE AS OF 2017-02-07**: Firefox is planning to deprecate the type of
add-ons that are built by `jpm`. If you're building a new add-on, consider a
[WebExtension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions)
instead and check out the [web-ext](https://github.com/mozilla/web-ext)
tool which has all the same features as `jpm`. Here are some
[resources](https://wiki.mozilla.org/Add-ons/developer/communication#Migration_paths_for_developers_of_legacy_add-ons)
to help you migrate a legacy `jpm` built add-on.

Replacing the previous python tool for developing Firefox Add-ons,
[cfx](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx),
jpm is a utility for developing, testing, and packaging add-ons.

## Install

Install the latest stable version from NPM:

    npm install --global jpm

Alternatively, you can install
from the GitHub source to get the latest features or to work on jpm itself.
Use [npm link](https://www.npmjs.org/doc/cli/npm-link.html) to add the `jpm` global to your path:

    git clone https://github.com/mozilla-jetpack/jpm.git
    cd jpm
    npm install
    npm link

## Usage

Type `jpm --help` for all available commands and options or read the documentation linked below.

### Documentation

* [Getting Started with jpm](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_Started_%28jpm%29)
* [package.json keys that jpm uses](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/package_json#Key_reference)
* [Command Line Guide](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm)
* [Self-hosting signed add-ons](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#Supporting_updates_for_self-hosted_add-ons)
* [Transitioning From CFX](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx_to_jpm)

## Contributing

Read about [how to contribute patches](CONTRIBUTING.md) to `jpm`.

## Using Post and Watchpost

**Note: this is experimental**

### Setup

You must have the [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/)
installed on a pre-production Firefox and you need to use a profile
that sets `xpinstall.signatures.required` to `false`
([more info](http://www.ghacks.net/2015/06/19/how-to-disable-the-firefox-40-add-on-signing-requirement/)). For logging with `watchpost`, also see [Developing without browser restarts](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#Developing_without_browser_restarts).

### Usage

Once this has completed, setup a watchpost:

    jpm watchpost --post-url http://localhost:8888/

This will watch for changes to the current working directory and post a new xpi to your installed
Extension Auto-Installer which will then install the new xpi.  To end the process, use the hokey, `CTRL + C`.

For a simple xpi and post, use:

    jpm post --post-url http://localhost:8888/

## License

[MPL-2.0](https://mozilla.org/MPL/2.0/)
