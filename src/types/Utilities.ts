/** One of 'value' or 'error' should always be returned */
export interface IResponse<T> {
  value?: T;
  error?: string | string[];
}

export interface IResponseString extends IResponse<string> {}
export interface IResponseBoolean extends IResponse<boolean> {}
export interface IResponseStringList extends IResponse<string[]> {}

export interface INextRelease {
  feat: number;
  fix: number;
}
