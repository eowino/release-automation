export interface IRealease {
  /** The name of the branch you want to create a release from */
  branchName?: string;
  /** The base branch you want to merge branches into. Default is master. */
  baseBranch?: string;
  /** The list of branches to branch into branchName */
  selectedBranches?: string[];
  /** Last logged error while executing */
  error?: string[];
  /** The list of branches already merged */
  mergedBranches?: string[];
  /** Whether you want to push to a staging branch or not */
  pushTostaging?: boolean;
  /** The name of the branch you want to push to */
  stagingBranch?: string;
  /** Whether you want to use the existing branch */
  useExisitingBranch?: boolean;
  /** Whether you wish to merge branches */
  wishToMerge?: boolean;
  /** Next release version */
  nextReleaseVersion?: string;
  /** Github release URL */
  releaseURL?: string;
  /** Whether you want to resume with the release process */
  resume?: boolean;
}
