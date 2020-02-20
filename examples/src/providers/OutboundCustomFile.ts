import { IOutboundProvider } from 'coronado-bridge';
import OutboundFile, { IOutboundFileConfig } from './OutboundFile';

const outboundFileConfig: IOutboundFileConfig = {
  filePath: './messages.json',
};

interface IHandlerReq {
  query: {
    id: number;
    type: string;
  };
  body: any;
}

// Adds URL query to the body, and writes to a file, example POST /messages?id=1
export default class OutboundCustomFile implements IOutboundProvider {
  handler(req: IHandlerReq): Promise<void> {
    return new Promise((resolve, reject) => {
      let message = this.createMessage(req);
      const outboundFile = new OutboundFile(outboundFileConfig);
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
