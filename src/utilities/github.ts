import axios, { AxiosResponse } from 'axios';
import { ICreatePR, IGithubPR } from '../types/Github';

// WIP: currently getting a 404
export async function createPR(
  owner: string,
  repo: string,
  options: IGithubPR,
): Promise<ICreatePR> {
  const URL = `https://api.github.com/repos/${owner}/${repo}/pulls`;

  try {
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
  } catch ({ response: { status, statusText } }) {
    return {
      status,
      statusText,
    };
  }
}
