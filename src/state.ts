import { join } from 'path';

import { PROGRESS_FILE, UNABLE_TO_SERIALISE } from './constants/Release';
import { IRealease } from './types/Release';
import { writeStringToFile } from './utilities/file';
import * as Log from './utilities/logger';

class ReleaseState {
  private state: IRealease;

  constructor() {
    this.initState();
  }

  set branchName(branchName: string) {
    this.state.branchName = branchName;
  }

  set baseBranch(baseBranch: string) {
    this.state.baseBranch = baseBranch;
  }

  set branchesToMerge(branchesToMerge: string[]) {
    this.state.branchesToMerge = branchesToMerge;
  }

  set error(error: string | string[]) {
    this.state.error = error;
  }

  set mergedBranches(mergedBranches: string[]) {
    this.state.mergedBranches = mergedBranches;
  }

  set staging(staging: boolean) {
    this.state.staging = staging;
  }

  set stagingBranch(stagingBranch: string) {
    this.state.stagingBranch = stagingBranch;
  }

  public toJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  public initState() {
    const cwd = process.cwd();
    const progressFilePath = join(cwd, PROGRESS_FILE);
    try {
      const initialState = require(progressFilePath);
      this.state = initialState;
    } catch {
      this.state = {};
    }
  }

  public async serialize() {
    const { error } = await writeStringToFile(this.toJSON());

    if (error) {
      Log.danger(UNABLE_TO_SERIALISE);
      Log.danger(error);
    }
  }
}

const state = new ReleaseState();

export default state;
