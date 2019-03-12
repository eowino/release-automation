export interface IRealease {
  /** The name of the branch you want to create a release from */
  branchName?: string;
  /** The base branch you want to merge branches into. Default is master. */
  baseBranch?: string;
  /** The list of branches to branch into branchName */
  branchesToMerge?: string[];
  /** Last logged error while executing */
  error?: string | string[];
  /** The list of branches already merged */
  mergedBranches?: string[];
  /** Whether you want to push to a staging branch or not */
  staging?: boolean;
  /** The name of the branch you want to push to */
  stagingBranch?: string;
}
