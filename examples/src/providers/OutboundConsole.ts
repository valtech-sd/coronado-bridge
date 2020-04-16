import { IOutboundProvider, IProviderReq } from 'coronado-bridge';

export default class OutboundConsole implements IOutboundProvider {
  handler(req: IProviderReq): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(req);
      resolve();
    });
  }
}
