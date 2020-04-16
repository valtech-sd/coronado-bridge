export interface IProviderReq {
  method: string;
  body: object;
  query: object;
  params?: Array<string>;
}

export interface IOutboundProvider {
  handler(message: IProviderReq): Promise<any>;
}
