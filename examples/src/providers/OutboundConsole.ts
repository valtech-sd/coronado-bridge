import { IOutboundProvider } from 'coronado-bridge';

export default class OutboundConsole implements IOutboundProvider {
  handler(req: object): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(req);
      resolve();
    });
  }
}
