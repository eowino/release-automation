import inquirer from 'inquirer';

import * as CLIConstants from '../constants/CLI';
import * as GitConstants from '../constants/Git';
import * as Prompt from '../constants/Prompt';
import * as CLITypes from '../types/CLI';
import * as NPM from '../utilities/npm';
import * as Util from '../utilities/utilities';
import * as Git from './git';
import * as Log from './logger';

function isRequired(validationMessage?: string) {
  return (value: string) => {
    if (value.trim().length > 0) {
      return true;
    } else {
      return validationMessage || Prompt.VALUE_REQUIRED;
    }
  };
}

async function continueIfBranchesNotChosen(
  currentBranch: string,
): Promise<boolean> {
  const branchMessage = ` (current branch = ${currentBranch})`;
  const { shouldContinue }: { shouldContinue: boolean } = await inquirer.prompt(
    {
      message: Prompt.NO_BRANCHES_CONTINUE + branchMessage,
      name: 'shouldContinue',
      type: 'confirm',
    },
  );

  return shouldContinue;
}

export async function resumeReleaseProcess(): Promise<boolean> {
  const { resume }: { resume: boolean } = await inquirer.prompt({
    message: Prompt.RESUME,
    name: 'resume',
    type: 'confirm',
  });

  return resume;
}

export async function promptBranches(
  currentBranch: string,
): Promise<CLITypes.IPromptBranches> {
  let shouldContinue = true;
  const { error } = await Git.fetchAll();

  if (error) {
    return {
      error: error as string,
    };
  }

  const branches = await Git.getAllBranches();
  const withoutCurrentBranch = branches.filter(
    branch => branch !== currentBranch,
  );

  let filteredBranches = await getFilteredBranches(withoutCurrentBranch);

  if (filteredBranches.length === 0) {
    const tryAgain = await tryFiltersAgain();

    if (tryAgain) {
      await promptBranches(currentBranch);
    } else {
      filteredBranches = withoutCurrentBranch;
    }
  }

  const {
    selectedBranches,
  }: { selectedBranches: string[] } = await inquirer.prompt({
    choices: filteredBranches,
    message: Prompt.CHOOSE_BRANCHES,
    name: 'selectedBranches',
    type: 'checkbox',
  });

  if (selectedBranches.length === 0) {
    shouldContinue = await continueIfBranchesNotChosen(currentBranch);
  } else {
    Log.newLine();

    const confirmed = await confirmBranches(selectedBranches);
    if (!confirmed) {
      await promptBranches(currentBranch);
    }
  }

  return {
    selectedBranches,
    shouldContinue,
  };
}

export async function promptForNewBranchName(): Promise<
  CLITypes.IPromptTargetBranches
> {
  const { branchName }: { branchName: string } = await inquirer.prompt({
    default: Prompt.USE_EXISTING_BRANCH,
    message: Prompt.NEW_BRANCH_NAME,
    name: 'branchName',
    type: 'input',
    validate: isRequired(),
  });

  const defaultChosen = branchName === Prompt.USE_EXISTING_BRANCH;

  const { baseBranch }: { baseBranch: string } = await inquirer.prompt({
    default: GitConstants.DEFAULT_BASE_BRANCH,
    message: Prompt.BASE_BRANCH,
    name: 'baseBranch',
    type: 'input',
    validate: isRequired(),
    when: defaultChosen === false,
  });

  return {
    baseBranch,
    branchName: defaultChosen ? null : branchName,
    useExisiting: defaultChosen,
  };
}

export async function promptForNextReleaseVersion(
  branchNames: string[],
): Promise<{ nextVersion: string; suggestedVersion: string }> {
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
    validate: isRequired(CLIConstants.MUST_SELECT_NEXT_VERSION),
  });

  return {
    nextVersion,
    suggestedVersion,
  };
}

export async function confirmBranches(branches: string[]): Promise<boolean> {
  const stringBranches = branches.join('\n - ');
  const { confirmed }: { confirmed: boolean } = await inquirer.prompt({
    default: true,
    message: Prompt.CONFIRM_BRANCHES + Log.confirm(`\n - ${stringBranches}\n`),
    name: 'confirmed',
    type: 'confirm',
  });

  return confirmed;
}

export async function getFilteredBranches(
  branches: string[],
): Promise<string[]> {
  const { patterns }: { patterns: string } = await inquirer.prompt({
    default: Prompt.SHOW_ALL_BRANCHES,
    message: Prompt.FILTER_BRANCHES,
    name: 'patterns',
    type: 'input',
  });

  if (patterns === Prompt.SHOW_ALL_BRANCHES) {
    return branches;
  }

  const filters = patterns.split(',');
  return Util.matchStringsFromPattern(filters, branches);
}

export async function tryFiltersAgain(): Promise<boolean> {
  const { tryAgain }: { tryAgain: boolean } = await inquirer.prompt({
    default: false,
    message: Prompt.NO_MATCHES_FOUND,
    name: 'tryAgain',
    type: 'confirm',
  });

  return tryAgain;
}

export async function doYouWishToMerge(): Promise<boolean> {
  const { wishToMerge }: { wishToMerge: boolean } = await inquirer.prompt({
    default: true,
    message: Prompt.WISH_TO_MERGE,
    name: 'wishToMerge',
    type: 'confirm',
  });

  return wishToMerge;
}

export async function createPRIntoStagingBranch(): Promise<{
  createPRToStagingBranch: boolean;
  stagingBranch: string;
}> {
  const {
    createPRToStagingBranch,
  }: { createPRToStagingBranch: boolean } = await inquirer.prompt({
    default: true,
    message: Prompt.CREATE_PR_TO_STAGING,
    name: 'createPRToStagingBranch',
    type: 'confirm',
  });

  const { stagingBranch }: { stagingBranch: string } = await inquirer.prompt({
    default: GitConstants.DEFAULT_STAGING_BRANCH,
    message: Prompt.NAME_OF_STAGING_BRANCH,
    name: 'stagingBranch',
    type: 'input',
    validate: isRequired(),
    when: createPRToStagingBranch,
  });

  return {
    createPRToStagingBranch,
    stagingBranch,
  };
}
