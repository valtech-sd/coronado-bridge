import express, { Request, Response, NextFunction } from 'express';
import timeout from 'connect-timeout';
import cors from 'cors';
import { ILogger } from './types';
import { IBridgeConfig } from './index';
import { IOutboundProvider, IProviderReq } from './provider';
import util from 'util';

import BridgeError from './bridge-error';
import OutboundResponse from './outbound-response';

class CoronadoBridge {
  private outboundProvider: IOutboundProvider;
  private config: IBridgeConfig;
  private logger?: ILogger;
  private servers: Array<any>;
  private corsOptions?: object;
  private requestTimeoutMs?: number;

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
    this.corsOptions = config.corsOptions;
    this.requestTimeoutMs = config.requestTimeoutMs;
    // 1. Instantiates the OutboundProvider
    this.outboundProvider = config.outboundProvider;
    // 2. Starts Express
    this.setupExpress();
  }

  /**
   * setupExpress
   * This function creates express servers on the given ports.
   * 1. Create an express server for each port in the config
   * 2. Sets up a generic server route that takes in all requests
   * @returns - None
   **/
  setupExpress() {
    this.logger?.info(`CoronadoBridge - setupExpress - starting setup`);
    let ports = this.config.ports || [3000];
    // 1. Create an express server for each port in the config
    ports.forEach((port: number) => {
      let app = express();
      // Add body parsing middleware (the one used is determined by the
      // request content-type header.
      // Express Middleware are explained here: https://expressjs.com/en/4x/api.html#express.urlencoded
      // TODO: Some of the middleware choices might require passing additional
      //  options. These could be exposed in IBridgeConfig if needed. For now,
      //  these are all set to defaults per the docs.
      app.use(express.json(this.config.jsonParsingOptions)); // content-type: application/json
      app.use(express.text()); // content-type: text/plain
      // Notice we support the IBridgeConfig passing in cors options
      app.use(cors(this.corsOptions));
      // 2. Sets up a generic server route
      app.all(
        // Takes all paths
        '*',
        // Times out per the Coronado Config or defaults to 30s
        timeout(this.requestTimeoutMs?.toString() || '30s'),
        // Defines our handler
        (req, res, next) => {
          // Disregard HTTP requests that are *not* GET, POST, PUT, DELETE
          if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(req.method) < 0) {
            this.logger?.info(
              `CoronadoBridge - request received with method ${req.method} -> will not pass to provider`
            );
            // OPTION still needs to be handled by cors. So we have to give this
            // to next() which is really the right way to handle this anyway
            next();
            return;
          }
          this.logger?.info(
            `CoronadoBridge - request received on port:${port} -> passing message to outboundProvider`
          );
          // Merge request body/query into one object for the message and add any passed params.
          // Note: Query properties override body properties (example URL: /?exchange=test&topic=coolfactor1)
          let providerReq: IProviderReq = {
            method: req.method,
            body: req.body,
            query: req.query,
            headers: req.headers,
            // params will be set below...
          };
          if (req.params) {
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
            .then((handlerResponse) => {
              this.logger?.info(`CoronadoBridge - handler processed message`); // Inspect the received handlerResponse to see if we have the structured class
              // OutboundResponse. If we do, we treat that special.
              if (handlerResponse instanceof OutboundResponse) {
                this.logger?.debug(
                  `CoronadoBridge - received an OutboundResponse <IProviderRes>. Will respond per that object.`
                );
                this.logger?.trace(
                  `CoronadoBridge - OutboundResponse: ${util.inspect(
                    handlerResponse
                  )}`
                );

                if (handlerResponse.headers) {
                  const headerKeys = Object.keys(handlerResponse.headers);
                  headerKeys.forEach((key, index) => {
                    // @ts-ignore
                    res.header(key, handlerResponse.headers[key]);
                  });
                }
                res.status(handlerResponse.status).send(handlerResponse.body);
              } else {
                // it's not our ObjectResponse, so just default to a simple output
                this.logger?.debug(
                  `CoronadoBridge - received a generic object. Auto-responding with HTTP=200 and the object.`
                );
                this.logger?.info(
                  `CoronadoBridge - Check your HTTP CLIENT for the response!`
                );
                res.status(200).send(handlerResponse);
              }
            })
            .catch((error) => {
              if (error instanceof BridgeError) {
                this.logger?.error(
                  `CoronadoBridge - handler error ${error.status} - ${error.message}`
                );
                res.status(error.status).send({
                  // Just send out the error object
                  error: {
                    status: error.status,
                    message: error.message,
                    name: error.name,
                  },
                });
              } else {
                this.logger?.error(`CoronadoBridge - handler error ${error}`);
                res.status(500).send({
                  message: error,
                });
              }
            });
        }
      );
      // Setup a default error handler (this should be LAST in the app.use chain!)
      app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        // On error, check to see what we can do
        this.logger?.error(`CoronadoBridge Error: ${err.message}`);
        // Check for some expected errors
        if (err.code === 'ETIMEDOUT') {
          // It's a timeout, so respond with client timeout
          res.status(408).send(err.message);
        } else {
          // It's something else, so we return server-error and the verbose message
          res.status(500).send(err.message);
        }
      });

      // With all the express setup one, let's tart the server
      const server = app.listen(port, () => {
        this.logger?.info(`CoronadoBridge - started express server on ${port}`);
      });

      this.servers.push(server);
    });

    // Log
    this.logger?.info(`CoronadoBridge - setupExpress - setup complete`);
  }

  close() {
    this.servers.forEach((server, index) => {
      server.close(() => {
        this.logger?.info(`CoronadoBridge - Closed server ${index}`);
      });
    });
  }
}

export default CoronadoBridge;
