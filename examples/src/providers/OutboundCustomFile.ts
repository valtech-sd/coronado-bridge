import { IOutboundProvider, IProviderReq } from 'coronado-bridge';
import OutboundFile, { IOutboundFileConfig } from './OutboundFile';
import { Logger } from 'log4js';

const outboundFileConfig: IOutboundFileConfig = {
  filePath: './messages.json',
};

interface IHandlerReq extends IProviderReq {
  query: {
    id: number;
    type: string;
  };
  body: any;
}

// Adds URL query to the body, and writes to a file, example POST /messages?id=1
export default class OutboundCustomFile implements IOutboundProvider {
  private logger: Logger;

  constructor(logger:Logger) {
    this.logger = logger;
  }

  handler(req: IHandlerReq): Promise<void> {
    return new Promise((resolve, reject) => {
      let message = this.createMessage(req);
      const outboundFile = new OutboundFile(outboundFileConfig, this.logger);
      // Reuse the inbuilt write to file handler
      outboundFile
        .handler(message)
        .then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  createMessage(req: IHandlerReq) {
    const id = req.query.id;
    const type = req.query.type;
    const location = this.getLocation(id);
    return { ...req.body, location, type };
  }

  getLocation(id: number) {
    const locations = ['Beach', 'Office', 'Hotel', 'Retail'];
    const location = locations[id];
    return location ? location : 'N/A';
  }
}
