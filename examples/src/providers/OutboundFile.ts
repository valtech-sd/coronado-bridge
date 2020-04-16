import { IOutboundProvider, IProviderReq } from 'coronado-bridge';
import fs from 'fs';

export interface IOutboundFileConfig {
  filePath: string;
}

class OutboundFile implements IOutboundProvider {
  private filePath: string;

  constructor(config: IOutboundFileConfig) {
    this.filePath = config.filePath;
  }

  handler(message: IProviderReq): Promise<void> {
    return new Promise((resolve, reject) => {
      let messages: Array<object> = [];
      fs.exists(this.filePath, exists => {
        if (exists) {
          const data = fs.readFileSync(this.filePath, 'utf-8');
          if (data) {
            messages = JSON.parse(data);
          }
        }
        messages.push(message);
        fs.writeFile(this.filePath, JSON.stringify(messages), 'utf-8', err => {
          if (err) throw err;
          console.log('Message written to file!');
          resolve();
        });
      });
    });
  }
}

export default OutboundFile;
