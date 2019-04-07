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
  if (isVersionRequested()) {
    Log.info(require('../package.json').version);
    process.exit();
  }

  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    await serialiseProgressAndExit(CLIConstants.MUST_BE_GIT_REPO);
  }

  if (stateHelper.releaseFileLocated) {
    Log.newLine();
    const resume = await CLI.resumeReleaseProcess();
    if (resume) {
      stateHelper.resume = resume;
    }
  }

  if (usePrompt('owner') && usePrompt('repo')) {
    setOwnerAndRepo();
  }

  if (usePrompt('branchName')) {
    await promptForNewBranchName();
    await setBranchName();
  } else {
    // in case not already on the branch
    await gitCheckoutBranch(stateHelper.state.branchName);
  }

  if (usePrompt('wishToMerge')) {
    const wishToMerge = await CLI.doYouWishToMerge();
    stateHelper.wishToMerge = wishToMerge;
  }

  if (stateHelper.state.wishToMerge) {
    await getBranchesToMerge();
  }

  await promptAndSetNextReleaseVersion();
  await pushBranchWithTags();
  await confirmAndCreatePRIntoStaging();
  generateReleaseURL();
  await serialiseProgressAndFinish();

  Log.newLine();
  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);
}

function isVersionRequested() {
  const flags = process.argv.slice(2);
  const versions = ['-v', '--v', '-version', '--version'];
  return flags.some(flag => versions.includes(flag));
}

async function serialiseProgressAndExit(errorMessage: string | string[], isError = true) {
  if (Array.isArray(errorMessage)) {
    errorMessage.forEach(message => {
      Log.danger(message);
    });

    if (isError) {
      stateHelper.addError(errorMessage);
    }
  } else {
    Log.danger(errorMessage);
    if (isError) {
      stateHelper.addError(errorMessage);
    }
  }

  await stateHelper.serialize();
  process.exit();
}

async function serialiseProgressAndFinish() {
  await stateHelper.serializeAndRename();
}

async function promptForNewBranchName() {
  Log.newLine();

  const { baseBranch, branchName, useExisting } = await CLI.promptForNewBranchName();

  stateHelper.baseBranch = baseBranch;
  stateHelper.branchName = branchName;
  stateHelper.useExistingBranch = useExisting;

  if (!useExisting) {
    const { value: createBranchValue, error: createBranchError } = await Git.createBranch(
      branchName,
      baseBranch,
    );
    if (createBranchError) {
      await serialiseProgressAndExit(createBranchError);
    } else if (createBranchValue) {
      Log.success(createBranchValue);
    }
  }

  return {
    branchName,
    useExisting,
  };
}

async function setBranchName() {
  Log.newLine();

  const { branchName, useExistingBranch } = stateHelper.state;

  if (useExistingBranch && !branchName) {
    const {
      error: getBranchNameError,
      value: getBranchNameValue,
    } = await Git.getBranchName();

    if (getBranchNameError) {
      await serialiseProgressAndExit(getBranchNameError);
    }

    stateHelper.branchName = getBranchNameValue;
  }
}

async function getBranchesToMerge() {
  Log.newLine();

  const { wishToMerge, selectedBranches: initialSelectedBranches } = stateHelper.state;

  if (wishToMerge && initialSelectedBranches.length === 0) {
    const {
      selectedBranches: branchesFromPrompt,
      shouldContinue: shouldContinueFromPrompt,
      error,
    } = await CLI.promptBranches(stateHelper.state.branchName);

    stateHelper.selectedBranches = branchesFromPrompt;
    stateHelper.shouldContinue = shouldContinueFromPrompt;

    if (error) {
      await serialiseProgressAndExit(error);
    }
  }

  const { selectedBranches, shouldContinue, mergedBranches } = stateHelper.state;
  const { inBoth, inStringsAOnly: branchesToMerge } = Util.getDiffFromStrings(
    selectedBranches,
    mergedBranches,
  );

  if (selectedBranches.length === 0 && !shouldContinue) {
    await serialiseProgressAndExit(CLIConstants.GOODBYE, false);
  }

  // diff selectedBranches with mergedBranches and only proceed to merge branches that haven't been merged
  if (selectedBranches.length > 0) {
    Log.info(CLIConstants.BEGIN_MERGE);

    if (inBoth.length > 0) {
      inBoth.forEach(branchName => {
        Log.success(`✅  ${branchName} already merged`);
      });
    }

    const { error: errorMerge, value: successfulMerges = [] } = await Git.mergeBranches(
      branchesToMerge || selectedBranches,
    );

    stateHelper.mergedBranches = stateHelper.state.mergedBranches.concat(
      successfulMerges,
    );

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
  } else if (selectedBranches.length > 0) {
    Log.success(CLIConstants.ALL_BRANCHES_MERGED);
  }
}

async function promptAndSetNextReleaseVersion() {
  Log.newLine();

  let suggestedVersion;

  if (usePrompt('nextReleaseVersion')) {
    const {
      nextVersion,
      suggestedVersion: suggestedVersionFromPrompt,
    } = await CLI.promptForNextReleaseVersion(stateHelper.state.selectedBranches);

    stateHelper.nextReleaseVersion = nextVersion;
    suggestedVersion = suggestedVersionFromPrompt;
  }

  const { nextReleaseVersion } = stateHelper.state;

  // suggestedVersion is null if unable to read from package.json or undefined as per usePrompt
  if (suggestedVersion) {
    Log.info(CLIConstants.SETTING_NEXT_NPM_VERSION);

    const { error: nextVersionError } = await NPM.setNextVersion(nextReleaseVersion);
    if (nextVersionError) {
      await serialiseProgressAndExit([
        CLIConstants.UNABLE_TO_SET_NPM_VERSION,
        nextVersionError as string,
      ]);
    }
  } else {
    // Manually set git tag version as unable to do via 'npm version ${nextVersion}'
    Log.info(CLIConstants.TAGGING_GIT_VERSION);
    await Git.setGitTagVersion(nextReleaseVersion);
  }
}

async function pushBranchWithTags() {
  const { branchName } = stateHelper.state;
  Log.info(CLIConstants.PUSHING_GIT_TAGS);

  const { error: pushError } = await Git.push(branchName);
  const { error: pushTagsError } = await Git.pushTags();

  if (pushError || pushTagsError) {
    await serialiseProgressAndExit([pushError as string, pushTagsError as string]);
  }
}

async function gitCheckoutBranch(branchName: string) {
  const { error } = await Git.checkoutBranch(branchName);
  if (error) {
    await serialiseProgressAndExit(error);
  }

  Log.info(`${GitConstants.SWITCH_TO_BRANCH} ${branchName}`);
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

  if (usePrompt('stagingBranch')) {
    const { stagingBranch } = await CLI.createPRIntoStagingBranch();
    stateHelper.stagingBranch = stagingBranch;
  }

  if (stateHelper.state.stagingBranch) {
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
  // fire off and don't wait for it - hence no 'await' for getRemote()
  Git.getRemote().then(async ({ error: gitRemoteError, value: gitRemoteValue }) => {
    if (gitRemoteError) {
      await serialiseProgressAndExit(gitRemoteError);
    }

    const { owner, repo } = Util.getOwnerAndRepo(gitRemoteValue);
    stateHelper.owner = owner;
    stateHelper.repo = repo;
  });
}

function generateReleaseURL() {
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

function formatLogOutput(stateProp: string, value: string | string[]) {
  if (Array.isArray(value)) {
    Log.info(`Resuming with ${Log.confirm(stateProp)} as:`);
    value.forEach(entry => {
      Log.info(`· ${entry}`);
    });
  } else {
    Log.info(`Resuming with ${Log.confirm(stateProp)} as: ${value}`);
  }
}

/**
 * @returns true if the property doesn't exist in state, therefore prompt user for value(s)
 */
function usePrompt(stateProp: string): boolean {
  // @ts-ignore
  const valueFromState = stateHelper.state[stateProp];
  if (valueFromState) {
    formatLogOutput(stateProp, valueFromState);
  }

  // if value doesn't exist - always prompt user
  const exists = !Boolean(valueFromState);

  // also consider it exists but user doesn't want to use it
  return exists || (Boolean(stateHelper.state.resume) && exists);
}
