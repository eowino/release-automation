import * as CLIConstants from './constants/CLI';
import * as Git from './utilities/git';
import * as Log from './utilities/logger';

async function run() {
  const isGitRepo = await Git.isGitRepository();
  if (!isGitRepo) {
    Log.danger(CLIConstants.MUST_BE_GIT_REPO);
    process.exit();
  }
}

run();
