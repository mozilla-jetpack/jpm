jpm
===

[![Build Status](https://travis-ci.org/jsantell/jpm.png)](https://travis-ci.org/jsantell/jpm)

Jetpack Manager for Node.js

## Usage

`jpm` has several commands: `run`, `xpi`, `init`, `test`, with details below. Some options are:

* `-b, --binary <path>` Use the specified Firefox binary to run the addon. Used in `run` and `test`.
* `-r, --retro` A stopgap solution to use old-style Jetpack addons by using an install.rdf and bootstrap file. This will be removed once AOM changes are completed. Used in `xpi`, `run` and `test`.
* `-v, --verbose` Prints additional debugging information.
* `--binary-args <CMDARGS>` Passes the additional arguments into Firefox. Multiple arguments must be enclosed in quotes.
* `-p, --profile <PROFILE>` Uses the profile name or path when running Firefox. Paths must start with either "./" or "/", or otherwise assumed to be a profile name.

### `jpm run`

Runs the current addon.

### `jpm test`

Tests the current addon.

### `jpm xpi`

Zips up the current addon into a `.xpi` file.

### `jpm init`

Provides a series of prompts to create a `package.json` for an addon.

