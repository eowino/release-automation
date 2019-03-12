import state from '../src/state';
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

async function serialiseProgressAndExit(errorMessage: string | string[]) {
  if (Array.isArray(errorMessage)) {
    errorMessage.forEach(message => {
      Log.danger(message);
    });
  } else {
    Log.danger(errorMessage);
  }

  state.error = errorMessage;
  await state.serialize();
  process.exit();
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
      serialiseProgressAndExit(createBranchError);
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
      serialiseProgressAndExit(getBranchNameError);
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
      serialiseProgressAndExit([
        CLIConstants.EXIT_AFTER_MERGE_FAIL,
        errorMerge as string,
      ]);
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
    serialiseProgressAndExit(CLIConstants.MUST_SELECT_NEXT_VERSION);
  }

  // suggestedVersion is null if unable to read from package.json
  if (suggestedVersion) {
    Log.info(CLIConstants.SETTING_NEXT_NPM_VERSION);

    const { error: nextVersionError } = await NPM.setNextVersion(nextVersion);
    if (nextVersionError) {
      serialiseProgressAndExit([
        CLIConstants.UNABLE_TO_SET_NPM_VERSION,
        nextVersionError as string,
      ]);
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
    serialiseProgressAndExit(pushTagsError);
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
      serialiseProgressAndExit(checkoutStagingError);
    }
  }
}

async function createStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.STAGING_NOT_FOUND_CREATE);

  const { error: createBranchError } = await Git.createBranch(stagingBranch);

  if (createBranchError) {
    serialiseProgressAndExit(createBranchError);
  }
}

async function mergeBranchIntoStagingBranch(branchName: string) {
  Log.newLine();
  Log.info(CLIConstants.MERGE_BRANCH_INTO_STAGING);

  const { error: mergeBranchError } = await Git.mergeBranch(branchName);
  if (mergeBranchError) {
    serialiseProgressAndExit(mergeBranchError);
  }
}

async function pushStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.PUSHING_STAGING_BRANCH);
  const { error: pushStagingBranchError } = await Git.push(stagingBranch);
  if (pushStagingBranchError) {
    Log.danger(pushStagingBranchError);
    state.error = pushStagingBranchError;
  }
}

async function generateReleaseURL(nextVersion: string) {
  Log.newLine();

  const {
    error: getRemoteError,
    value: getRemoteValue,
  } = await Git.getRemote();
  if (getRemoteError) {
    serialiseProgressAndExit(getRemoteError);
  }

  const githubRelaseUrl = Util.generateReleaseURL(getRemoteValue, nextVersion);
  Log.success('Edit the release notes here:');
  Log.underline(Log.confirm(githubRelaseUrl));
}
