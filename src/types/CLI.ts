export interface IPromptBranches {
  selectedBranches: string[];
}

export interface IPromptTargetBranches {
  branchName: string;
  baseBranch: string;
  useExisiting?: boolean;
}
