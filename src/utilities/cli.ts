import inquirer from 'inquirer';

import * as Git from '../constants/Git';
import * as Prompt from '../constants/Prompt';
import * as CLITypes from '../types/CLI';
import * as git from './git';

export async function promptBranches(): Promise<CLITypes.IPromptBranches> {
  try {
    const branches = await git.getAllBranches();
    const answers: { selectedBranches: string[] } = await inquirer.prompt({
      choices: branches,
      message: Prompt.CHOOSE_BRANCHES,
      name: 'selectedBranches',
      type: 'checkbox',
    });

    return answers;
  } catch (e) {
    return null;
  }
}

export async function promptForNewBranchName(): Promise<
  CLITypes.IPromptTargetBranches
> {
  try {
    const { branchName }: { branchName: string } = await inquirer.prompt({
      default: Prompt.USE_EXISTING_BRANCH,
      message: Prompt.NEW_BRANCH_NAME,
      name: 'branchName',
      type: 'input',
    });

    const { baseBranch }: { baseBranch: string } = await inquirer.prompt({
      default: Git.DEFAULT_BASE_BRANCH,
      message: Prompt.BASE_BRANCH,
      name: 'baseBranch',
      type: 'input',
    });

    return {
      baseBranch,
      branchName,
      useExisiting: branchName === Prompt.USE_EXISTING_BRANCH,
    };
  } catch (e) {
    return null;
  }
}
