export interface IRelease {
  /** The branch you always want to create a new branch from. Default is master. */
  baseBranch: string;
}

export interface IRealeaseProgress extends IRelease {
  /** The branch you always want to create a new branch from. */
  branchName: string;
  /** The list of branches to branch into branchName */
  branchesToMerge: string[];
  /** Last logged error while executing */
  error?: string;
  /** The list of branches already merged */
  mergedBranches?: string[];
}

export interface IRealeaseConfig extends IRelease {
  /** Whether the edit release notes Github page should be opened when the process completes */
  open?: boolean;
}
