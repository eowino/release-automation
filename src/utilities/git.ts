import { spawn } from 'child_process';

import * as GitConstants from '../constants/Git';
import { IResponseString, IResponseStringList } from '../types/Utilities';
import { bufferToString } from './utilities';

export async function getAllBranches(): Promise<string[]> {
  const git = spawn('git', ['branch', '-a']);

  const promise: Promise<string[]> = new Promise((res, rej) => {
    git.stdout.on('data', (data: Buffer) => {
      const branches = getListOfBranches(bufferToString(data));
      res(branches);
    });
    git.stderr.on('data', (data: Buffer) => {
      rej(bufferToString(data));
    });
  });

  return promise;
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
  const git = spawn('git', ['rev-parse', '--is-inside-work-tree']);

  const promise: Promise<boolean> = new Promise(res => {
    git.stdout.on('data', (data: Buffer) => {
      const isGitRepo = bufferToString(data) === 'true' ? true : false;
      res(isGitRepo);
    });

    git.stderr.on('data', () => {
      res(false);
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

  const git = spawn('git', ['checkout', '-b', newBranchName, baseBranch]);

  const promise: Promise<IResponseString> = new Promise((res, rej) => {
    git.stdout.on('data', (data: Buffer) => {
      res({
        value: bufferToString(data),
      });
    });
    git.stderr.on('data', (data: Buffer) => {
      const output = bufferToString(data);
      // sometimes reports a false negative
      if (output.includes('Switched to a new branch')) {
        res({
          value: output,
        });
      } else {
        res({
          error: output,
        });
      }
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
  const git = spawn('git', ['merge', branchName]);

  const promise: Promise<IResponseString> = new Promise(res => {
    git.stdout.on('data', (data: Buffer) => {
      res({
        value: bufferToString(data),
      });
    });
    git.stderr.on('data', (data: Buffer) => {
      res({
        error: bufferToString(data),
      });
    });
  });

  return promise;
}

function mergeMessage(branchName: string, response: string) {
  return `Branch name: ${branchName}, Result: ${response}`;
}

/**
 * @param branches The list of branches you want to merge into the current branch
 * @returns A list of error messages
 */
export async function mergeBranches(
  branches: string[],
): Promise<IResponseStringList> {
  const failedMerges: string[] = [];
  const succesfulMerges: string[] = [];

  for (const branch of branches) {
    const response = await mergeBranch(branch);
    if (response.error) {
      failedMerges.push(mergeMessage(branch, response.error as string));
    }
    if (response.value) {
      succesfulMerges.push(mergeMessage(branch, response.value as string));
    }
  }

  return Promise.resolve<IResponseStringList>({
    error: failedMerges,
    value: succesfulMerges,
  });
}

export async function push(
  args: ReadonlyArray<string>,
): Promise<IResponseString> {
  const git = spawn('git', ['push', ...args]);

  const promise: Promise<IResponseString> = new Promise(res => {
    git.stdout.on('data', (data: Buffer) => {
      res({
        value: bufferToString(data),
      });
    });
    git.stderr.on('data', (data: Buffer) => {
      res({
        error: bufferToString(data),
      });
    });
  });

  return promise;
}

export async function pushFollowTags(): Promise<IResponseString> {
  return await push(['--follow-tags']);
}

export async function checkoutBranch(
  branchName: string,
): Promise<IResponseString> {
  const git = spawn('git', ['checkout', branchName]);

  const promise: Promise<IResponseString> = new Promise(res => {
    git.stdout.on('data', (data: Buffer) => {
      res({
        value: bufferToString(data),
      });
    });
    git.stderr.on('data', (data: Buffer) => {
      res({
        error: bufferToString(data),
      });
    });
  });

  return promise;
}
