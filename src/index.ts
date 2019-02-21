import * as CLIConstants from './constants/CLI';
import * as GitConstants from './constants/Git';
import * as CLI from './utilities/cli';
import * as Git from './utilities/git';
import * as Log from './utilities/logger';
import * as NPM from './utilities/npm';
import * as Util from './utilities/utilities';

export async function run() {
  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    Log.danger(CLIConstants.MUST_BE_GIT_REPO);
    process.exit();
  }

  const { branchName, useExisiting } = await promptForNewBranchName();
  const nameOfBranch = await setBranchName(branchName, useExisiting);
  const selectedBranches = await getBranchesToMerge(nameOfBranch);
  const nextVersion = await promptAndSetNextReleaseVersion(selectedBranches);

  await pushGitTags(nameOfBranch);
  await gitCheckoutPreprodBranch();
  await mergeBranchIntoPreprodBranch(nameOfBranch);
  await pushPreprodBranch();

  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);

  await generateReleaseURL(nextVersion);
}

async function promptForNewBranchName() {
  const {
    baseBranch,
    branchName,
    useExisiting,
  } = await CLI.promptForNewBranchName();

  if (!useExisiting) {
    const {
      value: createBranchValue,
      error: createBranchError,
    } = await Git.createBranch(branchName, baseBranch);
    if (createBranchError) {
      Log.danger(createBranchError);
      process.exit();
    } else if (createBranchValue) {
      Log.success(createBranchValue);
    }
  }

  return {
    branchName,
    useExisiting,
  };
}

async function setBranchName(branchName: string, useExisiting: boolean) {
  let name = branchName;

  if (useExisiting) {
    const {
      error: getBranchNameError,
      value: getBranchNameValue,
    } = await Git.getBranchName();

    if (getBranchNameError) {
      Log.danger(getBranchNameError);
      process.exit();
    }

    name = getBranchNameValue;
  }

  return Promise.resolve(name);
}

async function getBranchesToMerge(branchName: string) {
  const { selectedBranches, shouldContinue } = await CLI.promptBranches(
    branchName,
  );

  if (selectedBranches.length === 0 && !shouldContinue) {
    Log.info(CLIConstants.GOODBYE);
    process.exit();
  }

  if (selectedBranches.length > 0) {
    Log.info(CLIConstants.BEGIN_MERGE);

    const {
      error: errorMerge,
      value: successfulMerges = [],
    } = await Git.mergeBranches(selectedBranches);

    if (successfulMerges.length > 0) {
      successfulMerges.forEach(message => {
        Log.success(message);
      });
    }

    if (errorMerge) {
      Log.danger(CLIConstants.EXIT_AFTER_MERGE_FAIL);
      Log.danger(errorMerge);
      process.exit();
    }
  }
  return selectedBranches;
}

async function promptAndSetNextReleaseVersion(selectedBranches: string[]) {
  const nextVersion = await CLI.promptForNextReleaseVersion(selectedBranches);
  if (!nextVersion) {
    Log.danger(CLIConstants.MUST_SELECT_NEXT_VERSION);
    process.exit();
  }

  Log.info(CLIConstants.SETTING_NEXT_NPM_VERSION);

  const { error: nextVersionError } = await NPM.setNextVersion(nextVersion);
  if (nextVersionError) {
    Log.danger(CLIConstants.UNABLE_TO_SET_NPM_VERSION);
    Log.danger(nextVersionError);
    process.exit();
  }

  return nextVersion;
}

async function pushGitTags(branchName: string) {
  Log.info(CLIConstants.PUSHING_GIT_TAGS);

  const { error: pushTagsError } = await Git.pushFollowTags(branchName);
  if (pushTagsError) {
    Log.danger(pushTagsError);
    process.exit();
  }
}

async function gitCheckoutPreprodBranch() {
  Log.info(CLIConstants.CHECKOUT_PREPROD_BRANCH);

  const { error: checkoutPreprodError } = await Git.checkoutBranch('preprod');
  if (checkoutPreprodError) {
    Log.danger(checkoutPreprodError);
    process.exit();
  }
}

async function mergeBranchIntoPreprodBranch(branchName: string) {
  Log.info(CLIConstants.MERGE_BRANCH_INTO_PREPROD);

  const { error: mergeBranchError } = await Git.mergeBranch(branchName);
  if (mergeBranchError) {
    Log.danger(mergeBranchError);
    process.exit();
  }
}

async function pushPreprodBranch() {
  Log.info(CLIConstants.PUSHING_PREPROD_BRANCH);
  const { error: pushPreprodBranchError } = await Git.push(
    GitConstants.PREPROD_BRANCH,
  );
  if (pushPreprodBranchError) {
    Log.danger(pushPreprodBranchError);
  }
}

async function generateReleaseURL(nextVersion: string) {
  const {
    error: getRemoteError,
    value: getRemoteValue,
  } = await Git.getRemote();
  if (getRemoteError) {
    process.exit();
  }

  const githubRelaseUrl = Util.generateReleaseURL(getRemoteValue, nextVersion);
  Log.success('Edit the release notes here:');
  Log.info(githubRelaseUrl);
}
