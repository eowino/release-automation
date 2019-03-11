import { writeFile } from 'fs';

import { PROGRESS_FILE } from '../constants/Release';
import { IResponseString } from '../types/Utilities';

export function writeStringToFile(data: string): Promise<IResponseString> {
  const promise: Promise<IResponseString> = new Promise(res => {
    writeFile(PROGRESS_FILE, data, 'utf8', error => {
      if (error) {
        res({
          error: error.message,
        });
      }

      res({
        value: 'Success',
      });
    });
  });

  return promise;
}
