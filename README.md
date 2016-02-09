JPM [![Dependency Status](https://david-dm.org/mozilla-jetpack/jpm.png)](https://david-dm.org/mozilla-jetpack/jpm) [![Build Status](https://travis-ci.org/mozilla-jetpack/jpm.png)](https://travis-ci.org/mozilla-jetpack/jpm)
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
git clone https://github.com/mozilla-jetpack/jpm.git
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
* `--prefs <path>` Uses a JSON file or common js file which exports a JSON object.  The keys of this object will be the pref names, the values will be the pref values.
* `-o, --overload <path>` Uses either the specified `<path>` or the path set in the environment variables `JETPACK_ROOT` as the root for [addon-sdk](https://github.com/mozilla/addon-sdk) modules instead of the ones built into Firefox.
* `--addon-dir <path>` Specify a source directory of the add-on (instead of current directory) when building an add-on with `xpi`.
* `--post-url <URL>` **experimental** Used to post a xpi to a URL.

### Commands

* `jpm init` Provides a series of prompts to create a `package.json` for an add-on.
* `jpm run` Runs the current add-on.
* `jpm test` Tests the current add-on.
* `jpm xpi` Zips up the current add-on into a `.xpi` file.
* `jpm post` **experimental** Zips up the current add-on into a `.xpi` file and post that to the `--post-url`.
* `jpm watchpost` **experimental** Zips up the current add-on into a `.xpi` file and post that to the `--post-url`,
  every time a file in the current working directory changes.
* `jpm sign` Retrieve a Mozilla-signed `.xpi` file for your current add-on.


### Documentation

* [Getting Started with jpm](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_Started_%28jpm%29)
* [package.json keys that jpm uses](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/package_json#Key_reference)
* [Command Line Guide](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm)
* [Self-hosting signed add-ons](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#Supporting_updates_for_self-hosted_add-ons)
* [Transitioning From CFX](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx_to_jpm)

### Examples

Run current add-on with Firefox Nightly on OSX:

    jpm run -b nightly

Turn add-on in the current directory into a `.xpi` file for deployment and installation:

    jpm xpi

Use local checkout of SDK modules for working on the SDK itself:

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

## Releasing new jpm versions

For releasing a new version, use the `release-it` command (installed when you run `npm install`) which creates an incremental version commit, pushes to GH, and npm, and adds a tag. If you want to do a minor or major release as opposed to the default patch release, [check out release-it's documentation](https://github.com/webpro/release-it#usage-examples) on how to do it (it's easy).

```
$ cd PATH_TO_JPM_REPO
$ release-it
```

This will push to GitHub as well -- which should be your fork. To also push the tags upstream, where upstream is most likely `mozilla-jetpack/jpm`:

```
$ git push upstream TAG_NAME
```

## License

[MPL-2.0](https://mozilla.org/MPL/2.0/)
