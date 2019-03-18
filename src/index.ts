import * as CLIConstants from './constants/CLI';
import * as GitConstants from './constants/Git';
import state from './state';
import * as CLI from './utilities/cli';
import * as Git from './utilities/git';
import * as Github from './utilities/github';
import * as Log from './utilities/logger';
import * as NPM from './utilities/npm';
import * as Util from './utilities/utilities';

export async function run() {
  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    await serialiseProgressAndExit(CLIConstants.MUST_BE_GIT_REPO);
  }

  setOwnerAndRepo();

  if (state.releaseFileLocated) {
    Log.newLine();
    const resume = await CLI.resumeReleaseProcess();
    if (resume) {
      state.resume = resume;
    }
  }

  const { branchName, useExisiting } = await promptForNewBranchName();
  const nameOfBranch = await setBranchName(branchName, useExisiting);
  const wishToMerge = await CLI.doYouWishToMerge();
  state.wishToMerge = wishToMerge;

  let selectedBranches: string[] = [];

  if (wishToMerge) {
    selectedBranches = await getBranchesToMerge(nameOfBranch);
  }

  const nextVersion = await promptAndSetNextReleaseVersion(selectedBranches);
  state.nextReleaseVersion = nextVersion;

  await pushBranchWithTags(nameOfBranch);

  Log.newLine();
  await confirmAndCreatePRIntoStaging();

  Log.newLine();
  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);

  await generateReleaseURL();
}

async function serialiseProgressAndExit(errorMessage: string | string[]) {
  if (Array.isArray(errorMessage)) {
    errorMessage.forEach(message => {
      Log.danger(message);
    });
    state.addError(errorMessage);
  } else {
    Log.danger(errorMessage);
    state.addError(errorMessage);
  }

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

  state.baseBranch = baseBranch;
  state.branchName = branchName;
  state.useExistingBranch = useExisiting;

  if (!useExisiting) {
    const {
      value: createBranchValue,
      error: createBranchError,
    } = await Git.createBranch(branchName, baseBranch);
    if (createBranchError) {
      await serialiseProgressAndExit(createBranchError);
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
      await serialiseProgressAndExit(getBranchNameError);
    }

    name = getBranchNameValue;
    state.branchName = name;
  }

  return Promise.resolve(name);
}

async function getBranchesToMerge(branchName: string) {
  Log.newLine();

  const { selectedBranches, shouldContinue, error } = await CLI.promptBranches(
    branchName,
  );

  if (error) {
    await serialiseProgressAndExit(error);
  }

  if (selectedBranches.length === 0 && !shouldContinue) {
    await serialiseProgressAndExit(CLIConstants.GOODBYE);
  }

  state.selectedBranches = selectedBranches;

  if (selectedBranches.length > 0) {
    Log.info(CLIConstants.BEGIN_MERGE);

    const {
      error: errorMerge,
      value: successfulMerges = [],
    } = await Git.mergeBranches(selectedBranches);

    state.mergedBranches = successfulMerges;

    if (successfulMerges.length > 0) {
      successfulMerges.forEach(successBranch => {
        Log.success(Git.getMergeMessage(successBranch));
      });
    }

    if (errorMerge) {
      await serialiseProgressAndExit([
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
    await serialiseProgressAndExit(CLIConstants.MUST_SELECT_NEXT_VERSION);
  }

  // suggestedVersion is null if unable to read from package.json
  if (suggestedVersion) {
    Log.info(CLIConstants.SETTING_NEXT_NPM_VERSION);

    const { error: nextVersionError } = await NPM.setNextVersion(nextVersion);
    if (nextVersionError) {
      await serialiseProgressAndExit([
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

async function pushBranchWithTags(branchName: string) {
  Log.newLine();
  Log.info(CLIConstants.PUSHING_GIT_TAGS);

  const { error: pushError } = await Git.push(branchName);
  const { error: pushTagsError } = await Git.pushTags();

  if (pushError || pushTagsError) {
    await serialiseProgressAndExit([
      pushError as string,
      pushTagsError as string,
    ]);
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
      await serialiseProgressAndExit(checkoutStagingError);
    }
  }
}

async function createStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.STAGING_NOT_FOUND_CREATE);

  const { error: createBranchError } = await Git.createBranch(stagingBranch);

  if (createBranchError) {
    await serialiseProgressAndExit(createBranchError);
  }
}

/**
 * @deprecated
 */
async function __mergeBranchIntoStagingBranch(branchName: string) {
  Log.newLine();
  Log.info(CLIConstants.MERGE_BRANCH_INTO_STAGING);

  const { error: mergeBranchError } = await Git.mergeBranch(branchName);
  if (mergeBranchError) {
    await serialiseProgressAndExit([
      CLIConstants.EXIT_AFTER_MERGE_FAIL,
      mergeBranchError as string,
    ]);
  }
}

async function confirmAndCreatePRIntoStaging() {
  Log.newLine();
  const {
    createPRToStagingBranch,
    stagingBranch,
  } = await CLI.createPRIntoStagingBranch();
  state.createPRToStagingBranch = createPRToStagingBranch;
  state.stagingBranch = stagingBranch;

  if (createPRIntoStagingBranch) {
    await createPRIntoStagingBranch();
  }
}

async function createPRIntoStagingBranch() {
  const { status, html_url, statusText } = await Github.createPR(
    state.owner,
    state.repo,
    {
      base: state.stagingBranch,
      body: '@TODO NEED BODY OF PR',
      head: state.branchName,
      title: `Prerelease ${state.nextReleaseVersion}`,
    },
  );

  if (status !== 201) {
    Log.danger(statusText);
  } else {
    Log.success(statusText);
    Log.confirm(`${GitConstants.PR_CREATED} ${html_url}`);
  }
}

/**
 * @deprecated
 */
async function __pushStagingBranch(stagingBranch: string) {
  Log.newLine();
  Log.info(CLIConstants.PUSHING_STAGING_BRANCH);
  const { error: pushStagingBranchError } = await Git.push(stagingBranch);

  if (pushStagingBranchError) {
    Log.danger(pushStagingBranchError);
    state.addError(pushStagingBranchError);
  }
}

function setOwnerAndRepo() {
  // fire off initial one and don't wait for it - hence no await for getRemote()
  Git.getRemote().then(
    async ({ error: gitRemoteError, value: gitRemoteValue }) => {
      if (gitRemoteError) {
        await serialiseProgressAndExit(gitRemoteError);
      }

      const { owner, repo } = Util.getOwnerAndRepo(gitRemoteValue);
      state.owner = owner;
      state.repo = repo;
    },
  );
}

async function generateReleaseURL() {
  Log.newLine();
  const githubRelaseUrl = Util.generateReleaseURL(
    state.owner,
    state.repo,
    state.nextReleaseVersion,
  );
  state.releaseURL = githubRelaseUrl;
  Log.success('Edit the release notes here:');
  Log.underline(Log.confirm(githubRelaseUrl));
}
