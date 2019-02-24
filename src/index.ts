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
  const wishToMerge = await CLI.doYouWishToMerge();
  let selectedBranches: string[] = [];

  if (wishToMerge) {
    selectedBranches = await getBranchesToMerge(nameOfBranch);
  }

  const nextVersion = await promptAndSetNextReleaseVersion(selectedBranches);
  await pushGitTags(nameOfBranch);

  Log.newLine();
  const { pushToStaging, stagingBranch } = await CLI.pushToStagingBranch();
  if (pushToStaging) {
    await gitCheckoutStagingBranch(stagingBranch);
    await mergeBranchIntoStagingBranch(nameOfBranch);
    await pushStagingBranch(stagingBranch);
  }

  Log.newLine();
  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);

  await generateReleaseURL(nextVersion);
}

async function promptForNewBranchName() {
  Log.newLine();

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
  Log.newLine();

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
  Log.newLine();

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
  Log.newLine();

  const {
    nextVersion,
    suggestedVersion,
  } = await CLI.promptForNextReleaseVersion(selectedBranches);
  if (!nextVersion) {
    Log.danger(CLIConstants.MUST_SELECT_NEXT_VERSION);
    process.exit();
  }

  // suggestedVersion is null if unable to read from package.json
  if (suggestedVersion) {
    Log.info(CLIConstants.SETTING_NEXT_NPM_VERSION);

    const { error: nextVersionError } = await NPM.setNextVersion(nextVersion);
    if (nextVersionError) {
      Log.danger(CLIConstants.UNABLE_TO_SET_NPM_VERSION);
      Log.danger(nextVersionError);
      process.exit();
    }
  } else {
    // Manually set git tag version as unable to do via 'npm version ${nextVersion}'
    Log.info(CLIConstants.TAGGING_GIT_VERSION);
    await Git.setGitTagVersion(nextVersion);
  }

  return nextVersion;
}

async function pushGitTags(branchName: string) {
  Log.newLine();
  Log.info(CLIConstants.PUSHING_GIT_TAGS);

  const { error: pushTagsError } = await Git.pushFollowTags(branchName);
  if (pushTagsError) {
    Log.danger(pushTagsError);
    process.exit();
  }
}

async function gitCheckoutStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.CHECKOUT_STAGING_BRANCH);

  const { error: checkoutStagingError } = await Git.checkoutBranch(
    stagingBranch,
  );
  if (checkoutStagingError) {
    if (checkoutStagingError.includes(GitConstants.BRANCH_NOT_FOUND)) {
      await createStagingBranch(stagingBranch);
    } else {
      Log.danger(checkoutStagingError);
      process.exit();
    }
  }
}

async function createStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.STAGING_NOT_FOUND_CREATE);

  const { error: createBranchError } = await Git.createBranch(stagingBranch);

  if (createBranchError) {
    Log.danger(createBranchError);
    process.exit();
  }
}

async function mergeBranchIntoStagingBranch(branchName: string) {
  Log.newLine();
  Log.info(CLIConstants.MERGE_BRANCH_INTO_STAGING);

  const { error: mergeBranchError } = await Git.mergeBranch(branchName);
  if (mergeBranchError) {
    Log.danger(mergeBranchError);
    process.exit();
  }
}

async function pushStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.PUSHING_STAGING_BRANCH);
  const { error: pushStagingBranchError } = await Git.push(stagingBranch);
  if (pushStagingBranchError) {
    Log.danger(pushStagingBranchError);
  }
}

async function generateReleaseURL(nextVersion: string) {
  Log.newLine();

  const {
    error: getRemoteError,
    value: getRemoteValue,
  } = await Git.getRemote();
  if (getRemoteError) {
    process.exit();
  }

  const githubRelaseUrl = Util.generateReleaseURL(getRemoteValue, nextVersion);
  Log.success('Edit the release notes here:');
  Log.underline(Log.confirm(githubRelaseUrl));
}
