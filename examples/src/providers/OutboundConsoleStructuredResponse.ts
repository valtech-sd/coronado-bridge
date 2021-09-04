// Package Dependencies
import { Logger } from 'log4js';
import util from 'util';
import {
  IOutboundProvider,
  IProviderReq,
  OutboundResponse,
} from 'coronado-bridge';

export default class OutboundConsoleStructuredResponse
  implements IOutboundProvider
{
  // Some instance properties
  private logger: Logger;

  // A constructor so we can pass in a logger and other bits
  constructor(logger: Logger) {
    this.logger = logger;
  }

  handler(req: IProviderReq): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger?.trace(`request: ${util.inspect(req, false, null, false)}`);
      // Create a structured response object so we can control HTTP response code and more...
      const structuredResponse = new OutboundResponse(
        { response: 'OK!', yourRequest: req },
        201
      );
      // Resolve with the object.
      resolve(structuredResponse);
    });
  }
}
