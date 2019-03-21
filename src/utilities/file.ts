import { rename, writeFile } from 'fs';

import { PROGRESS_FILE, PROGRESS_FILE_COMPLETE } from '../constants/Release';
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

export function renameFile(): Promise<IResponseString> {
  const promise: Promise<IResponseString> = new Promise(res => {
    rename(PROGRESS_FILE, PROGRESS_FILE_COMPLETE, error => {
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
