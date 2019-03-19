import * as CLIConstants from './constants/CLI';
import * as GitConstants from './constants/Git';
import stateHelper from './state';
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

  if (stateHelper.releaseFileLocated) {
    Log.newLine();
    const resume = await CLI.resumeReleaseProcess();
    if (resume) {
      stateHelper.resume = resume;
    }
  }

  const { branchName, useExisiting } = await promptForNewBranchName();
  const nameOfBranch = await setBranchName(branchName, useExisiting);
  const wishToMerge = await CLI.doYouWishToMerge();
  stateHelper.wishToMerge = wishToMerge;

  let selectedBranches: string[] = [];

  if (wishToMerge) {
    selectedBranches = await getBranchesToMerge(nameOfBranch);
  }

  const nextVersion = await promptAndSetNextReleaseVersion(selectedBranches);
  stateHelper.nextReleaseVersion = nextVersion;

  await pushBranchWithTags(nameOfBranch);
  await confirmAndCreatePRIntoStaging();
  await generateReleaseURL();

  Log.newLine();
  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);
}

async function serialiseProgressAndExit(errorMessage: string | string[]) {
  if (Array.isArray(errorMessage)) {
    errorMessage.forEach(message => {
      Log.danger(message);
    });
    stateHelper.addError(errorMessage);
  } else {
    Log.danger(errorMessage);
    stateHelper.addError(errorMessage);
  }

  await stateHelper.serialize();
  process.exit();
}

async function promptForNewBranchName() {
  Log.newLine();

  const {
    baseBranch,
    branchName,
    useExisiting,
  } = await CLI.promptForNewBranchName();

  stateHelper.baseBranch = baseBranch;
  stateHelper.branchName = branchName;
  stateHelper.useExistingBranch = useExisiting;

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
    stateHelper.branchName = name;
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

  stateHelper.selectedBranches = selectedBranches;

  if (selectedBranches.length > 0) {
    Log.info(CLIConstants.BEGIN_MERGE);

    const {
      error: errorMerge,
      value: successfulMerges = [],
    } = await Git.mergeBranches(selectedBranches);

    stateHelper.mergedBranches = successfulMerges;

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

async function confirmAndCreatePRIntoStaging() {
  Log.newLine();
  const {
    createPRToStagingBranch,
    stagingBranch,
  } = await CLI.createPRIntoStagingBranch();
  stateHelper.createPRToStagingBranch = createPRToStagingBranch;
  stateHelper.stagingBranch = stagingBranch;

  if (createPRIntoStagingBranch) {
    // await createPRIntoStagingBranch();
    generatePullRequestURL();
  }
}

async function createPRIntoStagingBranch() {
  const { status, html_url, statusText } = await Github.createPR(
    stateHelper.state.owner,
    stateHelper.state.repo,
    {
      base: stateHelper.state.stagingBranch,
      body: '@TODO NEED BODY OF PR',
      head: stateHelper.state.branchName,
      title: `Prerelease ${stateHelper.state.nextReleaseVersion}`,
    },
  );

  if (status !== 201) {
    stateHelper.addError(statusText);
    Log.danger(`${CLIConstants.FAILED_TO_CREATE_PR}: ${status} ${statusText}`);
  } else {
    Log.success(statusText);
    Log.confirm(`${GitConstants.PR_CREATED} ${html_url}`);
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
      stateHelper.owner = owner;
      stateHelper.repo = repo;
    },
  );
}

async function generateReleaseURL() {
  Log.newLine();
  const githubRelaseUrl = Util.generateReleaseURL(
    stateHelper.state.owner,
    stateHelper.state.repo,
    stateHelper.state.nextReleaseVersion,
  );
  stateHelper.releaseURL = githubRelaseUrl;
  Log.info('Edit the release notes here:');
  Log.underline(Log.confirm(githubRelaseUrl));
}

async function generatePullRequestURL() {
  Log.newLine();
  const { owner, branchName, repo, stagingBranch } = stateHelper.state;
  const URL = `https://github.com/${owner}/${repo}/compare/${stagingBranch}...${branchName}`;
  Log.info(CLIConstants.CREATE_PR);
  Log.underline(Log.confirm(URL));
}
