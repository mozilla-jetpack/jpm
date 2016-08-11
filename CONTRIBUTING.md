# Development

This is a guide to developing features for the `jpm` project.

## Ask Questions

* [Mailing List](https://wiki.mozilla.org/Labs/Jetpack#Mailing_list)
* #jetpack channel on [Mozilla's IRC network](http://irc.mozilla.org/)

## New Issues

* Check [existing issues](https://github.com/mozilla-jetpack/jpm/issues).
* Mention the OS, and software versions used.
* Provide steps to reproduce the issue.
* Mention your expected behavior.

## New Pull Requests

* Make sure the change is desirable, ask questions.
* Follow our [coding style](https://github.com/mozilla/addon-sdk/wiki/Coding-style-guide)
as well as possible.
* Write tests if possible.
* Ask for a help if you need it.
* Ask for a review from `@kumar303` or `@rpl` when you are ready.

## Testing

To run the jpm test suite

    npm test

To run just a specific type of test (functional, unit), run the associated script:

    npm run unit

## Writing commit messages

We follow the Angular style of
[semantic messages](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit)
when writing commit messages.
This allows us to auto-generate a changelog without too much noise in it.
Be sure to write the commit message in past tense so it will read
naturally as a historic changelog.

Examples:
* `feat: Added a systematic dysfunctioner`
* `fix: Fixed hang in systematic dysfunctioner`
* `docs: Improved contributor docs`
* `style: Added no-console linting, cleaned up code`
* `refactor: Split out dysfunctioner for testability`
* `perf: Systematic dysfunctioner is now 2x faster`
* `test: Added more tests for systematic dysfunctioner`
* `chore: Upgraded thing to 3.x.x`

If you want to use scopes then it would look more like:
`feat(dysfunctioner): Added --quiet option`.

You can check if the commit message on your branch is formatted correctly
by running this:

    npm run changelog-lint

## Creating a release

To release a new version of `jpm`, follow these steps:

* Pull from master to make sure you're up to date.
* Bump the version in `package.json`.
* Commit and push the version change
  (or create and merge a pull request for it).
* Create a changelog by running `npm run changelog`.
  This will output Markdown of all unreleased changes.
* Create a [new release](https://github.com/mozilla-jetpack/jpm/releases/new)
  and paste in the changelog Markdown.
  It may require some manual editing. For example, some commit messages
  might have been truncated.
  Title the github release after the new version you just
  added to `package.json` in the previous commit (example: `1.0.4`).
* When you publish the release, github creates a tag.
  When TravisCI builds the tag,
  it will automatically publish the package to
  [npm](https://www.npmjs.com/package/jpm).

## License

[MPL-2.0](https://mozilla.org/MPL/2.0/)
