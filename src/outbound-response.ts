import { IProviderRes } from './provider';

export default class OutboundResponse implements IProviderRes {
  body: object;
  status: number;
  headers?: object;
  constructor(body: object, status: number, headers?: object) {
    this.body = body;
    this.status = status;
    this.headers = headers;
  }
}
