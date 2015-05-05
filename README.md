JPM [![Dependency Status](https://david-dm.org/mozilla/jpm.png)](https://david-dm.org/mozilla/jpm) [![Build Status](https://travis-ci.org/mozilla/jpm.png)](https://travis-ci.org/mozilla/jpm)
===

[![NPM](https://nodei.co/npm/jpm.png?stars&downloads)](https://nodei.co/npm/jpm/)
[![NPM](https://nodei.co/npm-dl/jpm.png)](https://nodei.co/npm/jpm)

[Jetpack](https://wiki.mozilla.org/Jetpack) Manager for Node.js

Replacing the previous python tool for developing Firefox Add-ons, [cfx](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx), jpm is a utility for developing, testing, and packaging add-ons.

**Currently only works with Firefox 38+**. Check out the `--binary` flag for ensuring that you're using the correct release of Firefox with jpm.

## Install

Installing from npm:

```
npm install jpm -g
```

Installing from GitHub to get latest features or working on jpm itself, use [npm link](https://www.npmjs.org/doc/cli/npm-link.html) to add the `jpm` global to your path:

```
git clone https://github.com/mozilla/jpm.git
cd jpm
npm install
npm link
```

## Usage

`jpm` has several commands: `init`, `run`, `test`, `xpi`, with details below. Some options are:

* `-b, --binary <path>` Use the specified Firefox binary to run the add-on. Used in `run` and `test`.
* `-v, --verbose` Prints additional debugging information.
* `--binary-args <CMDARGS>` Passes other arguments into Firefox. Enclose multiple arguments in quotes.
* `--debug` Enable the add-on debugger when running the add-on.
* `-p, --profile <PROFILE>` Uses the profile name or path when running Firefox. Paths must start with either "./" or "/", or be considered a profile name.
* `--prefs [path]` Uses a JSON file or common js file which exports a JSON object.  The keys of this object will be the pref names, the values will be the pref values.
* `-o, --overload [path]` Uses either the specified `[path]` or the path set in the environment variables `JETPACK_ROOT` as the root for [addon-sdk](https://github.com/mozilla/addon-sdk) modules instead of the ones built into Firefox.
* `--post-url <URL>` **experimental** Used to post a xpi to a URL.

### Commands

* `jpm init` Provides a series of prompts to create a `package.json` for an add-on.
* `jpm run` Runs the current add-on.
* `jpm test` Tests the current add-on.
* `jpm xpi` Zips up the current add-on into a `.xpi` file.
* `jpm post` **experimental** Zips up the current add-on into a `.xpi` file and post that to the `--post-url`.
* `jpm watchpost` **experimental** Zips up the current add-on into a `.xpi` file and post that to the `--post-url`,
  every time a file in the current working directory changes.


### Documentation

* [Getting Started Guide](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_Started_%28jpm%29)
* [Command Line Guide](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm)
* [Transitioning From CFX](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx_to_jpm)

### Examples

Run current add-on with Firefox Nightly on OSX:

    jpm run -b nightly

Turn current add-on into a `.xpi` file for deployment and installation

    jpm xpi

Use local checkout of SDK modules for working on the SDK itself.

    jpm run -o /path/to/addon-sdk


## Testing

To run the jpm test suite

    npm test

To run just a specific type of test (functional, unit), run the associated script:

    npm run unit

## Using Post and Watchpost

**Note: this is experimental**

### Setup

You must have the [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/)
installed on Firefox.

### Usage

Once this has completed, setup a watchpost:

    jpm watchpost --post-url http://localhost:8888/

This will watch for changes to the current working directory and post a new xpi to your installed
Extension Auto-Installer which will then install the new xpi.  To end the process, use the hokey, `CTRL + C`.

For a simple xpi and post, use:

    jpm post --post-url http://localhost:8888/

## License

[MPL-2.0](https://mozilla.org/MPL/2.0/)
