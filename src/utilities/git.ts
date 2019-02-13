import { spawn } from 'child_process';

export async function getAllBranches() {
  const git = spawn('git', ['branch', '-a']);

  const promise = new Promise((res, rej) => {
    git.stdout.on('data', (data: Buffer) => {
      res(`${data}`);
    });
    git.stderr.on('data', (data: Buffer) => {
      rej(`${data}`);
    });
  });

  return promise;
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
