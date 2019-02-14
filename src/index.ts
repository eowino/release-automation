import * as CLIConstants from './constants/CLI';
import * as CLI from './utilities/cli';
import * as Git from './utilities/git';
import * as Log from './utilities/logger';

async function run() {
  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    Log.danger(CLIConstants.MUST_BE_GIT_REPO);
    process.exit();
  }

  const { baseBranch, branchName } = await CLI.promptForNewBranchName();
  const createBranch = await Git.createBranch(branchName, baseBranch); // TODO handle error
}

run();
