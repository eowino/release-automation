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
