import { exec } from 'child_process';

import * as GitConstants from '../constants/Git';
import {
  IResponseBoolean,
  IResponseString,
  IResponseStringList,
} from '../types/Utilities';
import { formatGitTagVersion } from './utilities';

const ORIGIN = 'origin/';

export async function getAllBranches(): Promise<string[]> {
  const cmd = 'git branch -r';

  const promise: Promise<string[]> = new Promise((res, rej) => {
    exec(cmd, (err, value) => {
      if (err) {
        rej({ error: err.message });
      } else {
        res(formatBranches(value));
      }
    });
  });

  return promise;
}

export function getMergeMessage(branchName: string): string {
  return `${GitConstants.SUCCESSFUL_MERGE} ${branchName}`;
}

function formatBranches(branches: string) {
  return removeOriginFromBranchName(getListOfBranches(branches));
}

function removeOriginFromBranchName(branches: string[]) {
  const ORIGIN_MASTER = 'origin/HEAD -> origin/master';

  return branches
    .filter(branchName => !branchName.includes(ORIGIN_MASTER))
    .map(branchName => branchName.substring(ORIGIN.length));
}

function getListOfBranches(branches: string): string[] {
  function removeAsterixFromName(branchName: string) {
    if (!branchName.includes('*')) {
      return branchName;
    }

    const [_, branch] = branchName.split('*');
    return branch;
  }

  return branches
    .split('\n')
    .filter(Boolean)
    .map(branch => removeAsterixFromName(branch).trim());
}

export async function isGitRepository(): Promise<boolean> {
  const cmd = 'git rev-parse --is-inside-work-tree';

  const promise: Promise<boolean> = new Promise(res => {
    exec(cmd, err => {
      if (err) {
        res(false);
      }
      res(true);
    });
  });

  return promise;
}

export async function fetchAll(): Promise<IResponseBoolean> {
  const cmd = 'git fetch --all';

  const promise: Promise<IResponseBoolean> = new Promise(res => {
    exec(cmd, err => {
      if (err) {
        res({ error: err.message });
      }
      res({
        value: true,
      });
    });
  });

  return promise;
}

export async function createBranch(
  newBranchName: string,
  baseBranch = GitConstants.DEFAULT_BASE_BRANCH,
): Promise<IResponseString> {
  if (!newBranchName) {
    return Promise.resolve({
      error: GitConstants.ERROR_CREATE_BRANCH,
    });
  }

  const cmd = `git checkout -b ${newBranchName} ${baseBranch}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      }

      res({
        value,
      });
    });
  });

  return promise;
}

/**
 * @param branchName The name of the branch you want to merge into the current branch
 */
export async function mergeBranch(
  branchName: string,
): Promise<IResponseString> {
  const cmd = `git merge ${ORIGIN}${branchName}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, err => {
      if (err) {
        res({ error: err.message });
      } else {
        res({ value: branchName });
      }
    });
  });

  return promise;
}

/**
 * @param branches The list of branches you want to merge into the current branch
 * @returns A list of error messages
 */
export async function mergeBranches(
  branches: string[],
): Promise<IResponseStringList> {
  const succesfulMerges: string[] = [];

  for (const branch of branches) {
    const { error, value } = await mergeBranch(branch);

    if (error) {
      return Promise.resolve({
        error,
        value: succesfulMerges,
      });
    }
    if (value) {
      succesfulMerges.push(value);
    }
  }

  return Promise.resolve<IResponseStringList>({
    value: succesfulMerges,
  });
}

export async function push(
  branchName: string,
  args: ReadonlyArray<string> = [],
): Promise<IResponseString> {
  const cmd = `git push --set-upstream origin ${branchName}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      }
      res({
        value,
      });
    });
  });

  return promise;
}

export async function pushTags(): Promise<IResponseString> {
  const cmd = 'git push origin --tags';

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      } else {
        res({ value });
      }
    });
  });

  return promise;
}

export async function setGitTagVersion(
  version: string,
): Promise<IResponseString> {
  const nextVersion = formatGitTagVersion(version);
  const cmd = `git tag -a ${nextVersion} -m ${nextVersion}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      } else {
        res({ value });
      }
    });
  });

  return promise;
}

export async function checkoutBranch(
  branchName: string,
): Promise<IResponseString> {
  const cmd = `git checkout ${branchName}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      } else {
        res({ value });
      }
    });
  });

  return promise;
}

export async function getBranchName(): Promise<IResponseString> {
  const cmd = 'git rev-parse --abbrev-ref HEAD';

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      }
      res({ value });
    });
  });

  return promise;
}

export async function getRemote(): Promise<IResponseString> {
  const cmd = 'git config --get remote.origin.url';

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, value) => {
      if (err) {
        res({ error: err.message });
      }
      res({ value });
    });
  });

  return promise;
}
