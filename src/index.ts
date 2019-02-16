import * as CLIConstants from './constants/CLI';
import * as CLI from './utilities/cli';
import * as Git from './utilities/git';
import * as Log from './utilities/logger';

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
    const { value, error } = await Git.createBranch(branchName, baseBranch);
    if (error) {
      Log.danger(error);
      process.exit();
    } else if (value) {
      Log.success(value);
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
}
