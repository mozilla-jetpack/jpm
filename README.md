jpm
===

[![Build Status](https://travis-ci.org/mozilla/jpm.png)](https://travis-ci.org/mozilla/jpm)

[Jetpack](https://wiki.mozilla.org/Jetpack) Manager for Node.js

## Usage

`jpm` has several commands: `run`, `xpi`, `init`, `test`, with details below. Some options are:

* `-b, --binary <path>` Use the specified Firefox binary to run the addon. Used in `run` and `test`.
* `-v, --verbose` Prints additional debugging information.
* `--binary-args <CMDARGS>` Passes the additional arguments into Firefox. Multiple arguments must be enclosed in quotes.
* `-p, --profile <PROFILE>` Uses the profile name or path when running Firefox. Paths must start with either "./" or "/", or otherwise assumed to be a profile name.

## Transitioning

Currently, any add-on with unspecified engines, or engines supporting versions of Firefox where AOM support for native jetpacks does not exist, jpm will add a `install.rdf` and `bootstrap.js` file for backwards compatability. This can be overridden with the `--force-aom` flag, which will not build with these additional files. This is mainly for testing AOM support while still in development.

### `jpm init`

Provides a series of prompts to create a `package.json` for an addon.

### `jpm run`

Runs the current addon.

### `jpm test`

Tests the current addon.

### `jpm xpi`

Zips up the current addon into a `.xpi` file.

## Testing

To run the jpm test suite

```
npm test
```

To run just a specific type of test (functional, unit), run the associated script:

```
npm run unit
```

## License

MPL 2.0
