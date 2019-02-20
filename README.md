# release-automation

[![npm version](https://badge.fury.io/js/release-automation.svg)](https://npmjs.org/package/release-automation 'View this project on npm')

## What

An opinionated CLI for release automation

## Prerequisites

This CLI requires Node 9.11.2 or higher.

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

```bash
npm install -g release-automation
```

## Usage

Then simply run the following in your `git` instantiated directory

```bash
release-automation
```

## Steps

1. Prompts you for a branch name. If you don't provide one, the current branch will be used.
   If you do provide a branch name, you will be asked which branch to base it on. The master branch
   will be used as default. Given both are provided, a new branch will be created.

2. Select the branches you want to merge into the selected branch from step 1. Also optional, as you may have done this already.

3. It will attempt to merge the selected branches into the current branch. All successful merges will be
   printed displayed. If any merge conflicts are raised, the process will exit and give you the
   chance to resolve them. Once resolved, you can run the script again.

4. Prompts you for the next version of your release. It will suggest one by looking at your current version
   in `package.json` and the branches you have selected. For example, if you're currently on version `1.0.0`, and you have selected 2 branches where the names begin with `feat/` and
   1 branch that begins with `fix/`, then the suggested version will be `1.2.1`.
   The suggested version will be used as the default version for the next release **if**
   you don't provide one. Other semver versions are not suggested for simplicity, but you may specify.

5. It will then set `npm version` which will subsequently also `git tag` the release.

6. The current branch will then be pushed with tags to github.

7. The current branch will then be merged into the preprod branch. The preprod branch will then be pushed.

8. A Github link to the release notes page for that release will be printed.
