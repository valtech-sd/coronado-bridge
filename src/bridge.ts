import express from 'express';
import cors from 'cors';
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
      app.use(cors());
      // 2. Sets up server route
      app.all('*', (req, res, next) => {
        // Disregard HTTP requests that are *not* GET, POST, PUT, DELETE
        if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(req.method) < 0) {
          if (this.logger) {
            this.logger.info(
              `CoronadoBridge - request received with method ${req.method} -> will not pass to provider`
            );
          }
          // OPTION still needs to be handled by cors. So we have to give this to next() which is really the right way to handle this anyway
          next();
          return;
        }
        if (this.logger) {
          this.logger.info(
            `CoronadoBridge - request received on port:${port} -> passing message to outboundProvider`
          );
        }
        // Merge request body/query into one object for the message and add any passed params.
        // Note: Query properties override body properties (example URL: /?exchange=test&topic=coolfactor1)
        let providerReq: IProviderReq = {
          method: req.method,
          body: req.body,
          query: req.query,
        };
        // TODO: Test to make sure we don't need this [0] split dance!
        if (req.params) {
          // The req.params is an object from Express and TypeScript checking
          // does not like it, so we'll ignore it here.
          // This is basically parsing out what comes in like this:
          //   "params": {
          //     "0": "/param1/param2/param3/param4"
          //   }
          // Into:
          //   "params": [
          //     "param1",
          //     "param2",
          //     "param3",
          //     "param4"
          //   ]
          // @ts-ignore
          const paramsArray = req.params['0'].split('/');
          paramsArray.shift(); // The first item is always undefined so lets remove it.
          // Now set it to our object
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
