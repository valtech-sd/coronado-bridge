import { IOutboundProvider, IProviderReq } from 'coronado-bridge';
import fs from 'fs';
import { Logger } from 'log4js';

export interface IOutboundFileConfig {
  filePath: string;
}

class OutboundFile implements IOutboundProvider {
  private filePath: string;
  private logger: Logger;

  constructor(config: IOutboundFileConfig, logger: Logger) {
    this.filePath = config.filePath;
    this.logger = logger;
  }

  handler(request: IProviderReq): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.appendFile(
        this.filePath,
        JSON.stringify(request) + '\n',
        'utf-8',
        (err) => {
          if (err) throw err;
          this.logger.info('Message written to file!');
          resolve();
        }
      );
    });
  }
}

export default OutboundFile;
