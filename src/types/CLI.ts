export interface IPromptBranches {
  selectedBranches?: string[];
  /** Defaulted to true. We assume the user has all the branches they need. */
  shouldContinue?: boolean;
  error?: string;
}

export interface IPromptTargetBranches {
  branchName: string;
  baseBranch: string;
  useExisting?: boolean;
}
