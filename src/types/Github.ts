import { AxiosResponse } from 'axios';

// docs: https://developer.github.com/v3/pulls/#create-a-pull-request

export interface IGithubPR {
  /** The title of the pull request. */
  title: string;
  /** The name of the branch where your changes are implemented */
  head: string;
  /** The name of the existing branch you want the changes pulled into. */
  base: string;
  /** The contents of the pull request. */
  body: string;
}

export interface IGithubPRResponse {
  /** example: https://api.github.com/repos/octocat/Hello-World/pulls/1347 */
  url?: string;
  /** example: "https://github.com/octocat/Hello-World/pull/1347" */
  html_url?: string;
  /** The state of the PR: e.g. open | closed | etc. */
  state?: string;
}

export interface ICreatePR extends IGithubPRResponse {
  status: number;
  statusText: string;
}
