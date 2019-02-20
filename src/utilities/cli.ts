import inquirer from 'inquirer';

import * as GitConstants from '../constants/Git';
import * as Prompt from '../constants/Prompt';
import * as CLITypes from '../types/CLI';
import * as NPM from '../utilities/npm';
import * as Util from '../utilities/utilities';
import * as Git from './git';

async function continueIfBranchesNotChosen(
  currentBranch: string,
): Promise<boolean> {
  try {
    const branchMessage = ` (current branch = ${currentBranch})`;
    const {
      shouldContinue,
    }: { shouldContinue: boolean } = await inquirer.prompt({
      message: Prompt.NO_BRANCHES_CONTINUE + branchMessage,
      name: 'shouldContinue',
      type: 'confirm',
    });

    return shouldContinue;
  } catch (e) {
    return null;
  }
}

export async function promptBranches(
  currentBranch: string,
): Promise<CLITypes.IPromptBranches> {
  try {
    let shouldContinue = true;
    const { error } = await Git.fetchAll();

    if (error) {
      return null;
    }

    const branches = await Git.getAllBranches();
    const withoutCurrentBranch = branches.filter(
      branch => branch !== currentBranch,
    );

    const {
      selectedBranches,
    }: { selectedBranches: string[] } = await inquirer.prompt({
      choices: withoutCurrentBranch,
      message: Prompt.CHOOSE_BRANCHES,
      name: 'selectedBranches',
      type: 'checkbox',
    });

    if (selectedBranches.length === 0) {
      shouldContinue = await continueIfBranchesNotChosen(currentBranch);
    }

    return {
      selectedBranches,
      shouldContinue,
    };
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

    const defaultChosen = branchName === Prompt.USE_EXISTING_BRANCH;

    const { baseBranch }: { baseBranch: string } = await inquirer.prompt({
      default: GitConstants.DEFAULT_BASE_BRANCH,
      message: Prompt.BASE_BRANCH,
      name: 'baseBranch',
      type: 'input',
      when: defaultChosen === false,
    });

    return {
      baseBranch,
      branchName: defaultChosen ? null : branchName,
      useExisiting: defaultChosen,
    };
  } catch (e) {
    return null;
  }
}

export async function promptForNextReleaseVersion(
  branchNames: string[],
): Promise<string> {
  try {
    const currentVersion = NPM.getCurrentNpmVersion();
    const suggestedVersion = Util.suggestNextReleaseVersion(
      currentVersion,
      branchNames,
    );
    const { nextVersion }: { nextVersion: string } = await inquirer.prompt({
      default: suggestedVersion,
      message: Prompt.NEXT_RELEASE_VERSION,
      name: 'nextVersion',
      type: 'input',
    });

    return nextVersion;
  } catch (e) {
    return null;
  }
}
