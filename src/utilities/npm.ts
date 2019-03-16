import { exec } from 'child_process';
import path from 'path';

import { IResponseString } from '../types/Utilities';

export async function setNextVersion(
  version: string,
): Promise<IResponseString> {
  const cmd = `npm version --allow-same-version ${version}`;

  const promise: Promise<IResponseString> = new Promise(res => {
    exec(cmd, (err, stdout) => {
      if (err) {
        res({ error: err.message });
      } else {
        res({ value: stdout });
      }
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
