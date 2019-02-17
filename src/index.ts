import * as CLIConstants from './constants/CLI';
import * as CLI from './utilities/cli';
import * as Git from './utilities/git';
import * as Log from './utilities/logger';
import * as NPM from './utilities/npm';
import * as Util from './utilities/utilities';

run();

async function run() {
  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    Log.danger(CLIConstants.MUST_BE_GIT_REPO);
    process.exit();
  }

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

  const { selectedBranches, shouldContinue } = await CLI.promptBranches();

  if (selectedBranches.length === 0 && !shouldContinue) {
    Log.log(CLIConstants.GOODBYE);
    process.exit();
  }

  if (selectedBranches.length > 0) {
    Log.log(CLIConstants.BEGIN_MERGE);

    const {
      error: errorMerges,
      value: successfulMerges,
    } = await Git.mergeBranches(selectedBranches);

    if (successfulMerges.length > 0) {
      successfulMerges.forEach(message => {
        Log.success(message);
      });
    }

    if (errorMerges.length > 0) {
      (errorMerges as string[]).forEach(errorMessage => {
        Log.danger(errorMessage);
      });

      Log.danger(CLIConstants.EXIT_AFTER_MERGE_FAIL);
      process.exit();
    }
  }

  const nextVersion = await CLI.promptForNextReleaseVersion(selectedBranches);
  if (!nextVersion) {
    Log.danger(CLIConstants.MUST_SELECT_NEXT_VERSION);
    process.exit();
  }

  Log.log(CLIConstants.SETTING_NEXT_NPM_VERSION);

  const { error: nextVersionError } = await NPM.setNextVersion(nextVersion);
  if (nextVersionError) {
    Log.danger(CLIConstants.UNABLE_TO_SET_NPM_VERSION);
    Log.danger(nextVersionError);
    process.exit();
  }

  Log.log(CLIConstants.PUSHING_GIT_TAGS);

  const { error: pushTagsError } = await Git.pushFollowTags();
  if (pushTagsError) {
    Log.danger(pushTagsError);
    process.exit();
  }

  Log.log(CLIConstants.CHECKOUT_PREPROD_BRANCH);

  const { error: checkoutPreprodError } = await Git.checkoutBranch('preprod');
  if (checkoutPreprodError) {
    Log.danger(checkoutPreprodError);
    process.exit();
  }

  // branchName could be undefined if a new branch wasn't created previously
  let nameOfBranch = branchName;

  if (!nameOfBranch) {
    const {
      error: getBranchNameError,
      value: getBranchNameValue,
    } = await Git.getBranchName();

    if (getBranchNameError) {
      Log.danger(getBranchNameError);
      process.exit();
    }

    nameOfBranch = getBranchNameValue;
  }

  Log.log(CLIConstants.MERGE_BRANCH_INTO_PREPROD);

  const { error: mergeBranchError } = await Git.mergeBranch(nameOfBranch);
  if (mergeBranchError) {
    Log.danger(mergeBranchError);
    process.exit();
  }

  Log.log(CLIConstants.PUSHING_PREPROD_BRANCH);
  const { error: pushPreprodBranchError } = await Git.push();
  if (pushPreprodBranchError) {
    Log.danger(pushPreprodBranchError);
  }

  Log.success(CLIConstants.RELEASE_PROCESS_FINISHED);

  const {
    error: getRemoteError,
    value: getRemoteValue,
  } = await Git.getRemote();
  if (getRemoteError) {
    process.exit();
  }

  const githubRelaseUrl = Util.generateReleaseURL(getRemoteValue, nextVersion);
  Log.success('Edit the release notes:', githubRelaseUrl);
}
