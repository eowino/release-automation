import { spawn } from 'child_process';
import path from 'path';

import { IResponseString } from '../types/Utilities';
import { bufferToString } from './utilities';

export async function setNextVersion(
  version: string,
): Promise<IResponseString> {
  const git = spawn('npm', ['version', '--allow-same-version', version]);

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

export function getCurrentNpmVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const { version } = require(pkgPath);
    return version;
  } catch (_) {
    return null;
  }
}
