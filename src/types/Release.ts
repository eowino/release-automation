export interface IRealease {
  /** The name of the branch you want to create a release from */
  branchName: string;
  /** The list of branches to branch into branchName */
  branchesToMerge: string[];
}
