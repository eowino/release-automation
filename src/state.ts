import { join } from 'path';

import { PROGRESS_FILE, UNABLE_TO_SERIALISE } from './constants/Release';
import { IRealease } from './types/Release';
import { writeStringToFile } from './utilities/file';
import * as Log from './utilities/logger';

class ReleaseState {
  private state: IRealease;

  constructor() {
    this.initState();
    this.state.error = [];
  }

  set branchName(branchName: string) {
    this.state.branchName = branchName;
  }

  set baseBranch(baseBranch: string) {
    this.state.baseBranch = baseBranch;
  }

  set selectedBranches(selectedBranches: string[]) {
    this.state.selectedBranches = selectedBranches;
  }

  public addError(error: string | string[]) {
    if (Array.isArray(error)) {
      this.state.error.push(...error.filter(Boolean));
    } else {
      this.state.error.push(error);
    }
  }

  set releaseURL(releaseURL: string) {
    this.state.releaseURL = releaseURL;
  }

  set mergedBranches(mergedBranches: string[]) {
    this.state.mergedBranches = mergedBranches;
  }

  set stagingBranch(stagingBranch: string) {
    this.state.stagingBranch = stagingBranch;
  }

  set useExistingBranch(useExisitingBranch: boolean) {
    this.state.useExisitingBranch = useExisitingBranch || false;
  }

  set wishToMerge(wishToMerge: boolean) {
    this.state.wishToMerge = wishToMerge || false;
  }

  set pushTostaging(pushTostaging: boolean) {
    this.state.pushTostaging = pushTostaging || false;
  }

  set nextReleaseVersion(nextReleaseVersion: string) {
    this.state.nextReleaseVersion = nextReleaseVersion;
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
      this.state.selectedBranches = [];
      this.state.mergedBranches = [];
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
