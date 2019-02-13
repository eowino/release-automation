import { spawn } from 'child_process';

export async function getAllBranches(): Promise<string[]> {
  const git = spawn('git', ['branch', '-a']);

  const promise: Promise<string[]> = new Promise((res, rej) => {
    git.stdout.on('data', (data: Buffer) => {
      const branches = getListOfBranches(`${data}`);
      res(branches);
    });
    git.stderr.on('data', (data: Buffer) => {
      rej(`${data}`);
    });
  });

  return promise;
}

export function getListOfBranches(branches: string): string[] {
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
      const isGitRepo = data.toString('utf8').trim() === 'true' ? true : false;
      res(isGitRepo);
    });

    git.stderr.on('data', () => {
      res(false);
    });
  });

  return promise;
}
