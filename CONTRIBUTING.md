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
* Create a changelog by running `npm run changelog`.
  This will output a Markdown list of all unreleased changes.
  You can copy/paste this into the tag notes on github after the tag is created.
  It may require some manual editing. For example, commit messages might be
  truncated.
* Bump the version in `package.json`.
* Commit and push the version change.
* Tag master with the new release you're about to create
  (example: `git tag 1.0.1`) and run `git push --tags upstream`.
* Go to the github
  [releases page](https://github.com/mozilla/jpm/releases),
  edit the tag you just created, and enter in the changelog notes.
* When [Travis](https://travis-ci.org/) builds the tag,
  it will automatically publish the package to
  [npm](https://www.npmjs.com/package/jpm).

## License

[MPL-2.0](https://mozilla.org/MPL/2.0/)
