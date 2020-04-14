import express from 'express';
import { Logger } from 'log4js';
import { IBridgeConfig } from './index';
import { IOutboundProvider, IProviderReq } from './provider'; 

import BridgeError from './bridge-error';

class CoronadoBridge {
  private outboundProvider: IOutboundProvider;
  private config: IBridgeConfig;
  private logger?: Logger;
  private servers: Array<any>;
  /**
   * constructor
   * This function configures and starts CoronadoBridge.
   * 1. Instantiates the OutboundProvider
   * 2. Starts Express
   * @params config: IBridgeConfig
   * @returns - None
   **/
  constructor(config: IBridgeConfig) {
    this.config = config;
    this.logger = config.logger;
    this.servers = [];
    // 1. Instantiates the OutboundProvider
    this.outboundProvider = config.outboundProvider;
    // 2. Starts Express
    this.setupExpress();
  }

  /**
   * setupExpress
   * This function creates express servers on the given ports.
   * 1. Create an express server for each port in the config
   * 2. Sets up server route
   * @returns - None
   **/
  setupExpress() {
    if (this.logger) {
      this.logger.info(`CoronadoBridge - setupExpress - starting setup`);
    }
    let ports = this.config.ports || [3000];
    // 1. Create an express server for each port in the config
    ports.forEach((port: number) => {
      let app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept'
        );
        next();
      });
      // 2. Sets up server route
      app.post('*', (req, res) => {
        if (this.logger) {
          this.logger.info(
            `CoronadoBridge - request received on port:${port} -> passing message to outboundProvider`
          );
        }
        // Merge request body/query into one object for the message and add any passed params.
        // Note: Query properties override body properties (example URL: /?exchange=test&topic=coolfactor1)
        let providerReq: IProviderReq = { body: req.body, query: req.query };
        if (req.params) {
          const paramsArray = req.params['0'].split('/');
          paramsArray.shift(); // The first item is always undefined so lets remove it.
          providerReq.params = paramsArray;
        }
        this.outboundProvider
          .handler(providerReq)
          .then(data => {
            if (this.logger) {
              this.logger.info(`CoronadoBridge - handler processed message`);
            }
            res.status(200).send(data);
          })
          .catch(error => {
            if (error instanceof BridgeError) {
              if (this.logger) {
                this.logger.error(
                  `CoronadoBridge - handler error ${error.status} - ${error.message} `
                );
              }
              res.status(error.status).send({
                message: error.message,
              });
            } else {
              if (this.logger) {
                this.logger.error(`CoronadoBridge - handler error ${error}`);
              }
              res.status(500).send({
                message: error,
              });
            }
          });
      });

      const server = app.listen(port, () => {
        if (this.logger) {
          this.logger.info(
            `CoronadoBridge - started express server on ${port}`
          );
        }
      });

      this.servers.push(server);
    });
    if (this.logger) {
      this.logger.info(`CoronadoBridge - setupExpress - setup complete`);
    }
  }

  close() {
    this.servers.forEach((server, index) => {
      server.close(() => {
        if (this.logger) {
          this.logger.info(`Closed server ${index}`);
        }
      });
    });
  }
}

export default CoronadoBridge;
