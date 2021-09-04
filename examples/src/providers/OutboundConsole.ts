import { IOutboundProvider, IProviderReq } from 'coronado-bridge';
import { Logger } from 'log4js';
import util from 'util';

export default class OutboundConsole implements IOutboundProvider {
  private logger: Logger;

  constructor(logger:Logger) {
    this.logger = logger;
  }
  handler(req: IProviderReq): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger?.trace(`request: ${util.inspect(req, false, null, false)}`);
      resolve({ result: 'OK!' });
    });
  }
}
