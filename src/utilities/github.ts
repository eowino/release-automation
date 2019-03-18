import axios, { AxiosResponse } from 'axios';
import { ICreatePR, IGithubPR } from '../types/Github';

export async function createPR(
  owner: string,
  repo: string,
  options: IGithubPR,
): Promise<ICreatePR> {
  const URL = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const {
    status,
    statusText,
    data,
  }: AxiosResponse<ICreatePR> = await axios.post(URL, options);

  return {
    ...data,
    status,
    statusText,
  };
}
