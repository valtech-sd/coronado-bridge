export interface IProviderReq {
  method: string;
  body: object;
  query: object;
  params?: Array<string>;
  headers: object;
}

export interface IProviderRes {
  body: object,
  status: number,
  headers?: object
}

export interface IOutboundProvider {
  handler(message: IProviderReq): Promise<any>;
}
