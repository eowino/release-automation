export interface IPromptBranches {
  selectedBranches: string[];
  /** Defaulted to true. We assume the user has all the branches they need. */
  shouldContinue?: boolean;
}

export interface IPromptTargetBranches {
  branchName: string;
  baseBranch: string;
  useExisiting?: boolean;
}
