export interface IRealease {
  /** The name of the branch you want to create a release from */
  branchName: string;
  /** The base branch you want to merge branches into. Default is master. */
  baseBranch: string;
  /** The list of branches to branch into branchName */
  branchesToMerge: string[];
  /** Last logged error while executing */
  error?: string;
  /** The list of branches already merged */
  mergedBranches?: string[];
}
