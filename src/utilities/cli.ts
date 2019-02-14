import inquirer from 'inquirer';

import * as Prompt from '../constants/Prompt';
import * as CLITypes from '../types/CLI';
import * as git from './git';

export async function promptBranches(): Promise<CLITypes.IPromptBranches> {
  try {
    const branches = await git.getAllBranches();
    const answers = await inquirer.prompt({
      choices: branches,
      message: Prompt.CHOOSE_BRANCHES,
      name: 'selectedBranches',
      type: 'checkbox',
    });

    return answers as Promise<CLITypes.IPromptBranches>;
  } catch (e) {
    return null;
  }
}
