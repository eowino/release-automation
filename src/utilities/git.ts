import { spawn } from 'child_process';

import * as GitConstants from '../constants/Git';
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
  newBranch = '',
  existingBranch = 'master',
): Promise<string> {
  if (!newBranch) {
    return Promise.reject(GitConstants.ERROR_CREATE_BRANCH);
  }

  const git = spawn('git', ['checkout', '-b', newBranch, existingBranch]);

  const promise: Promise<string> = new Promise((res, rej) => {
    git.stdout.on('data', (data: Buffer) => {
      res(bufferToString(data));
    });
    git.stderr.on('data', (data: Buffer) => {
      const output = bufferToString(data);
      // sometimes reports a false negative
      if (output.includes('Switched to a new branch')) {
        res(output);
      } else {
        rej(output);
      }
    });
  });

  return promise;
}
