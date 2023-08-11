import CoronadoBridge from './bridge';
import { ILogger } from './types';
import * as http from 'http';

import { IOutboundProvider, IProviderReq } from './provider';

import BridgeError from './bridge-error';
import OutboundResponse from './outbound-response';

export interface IBridgeConfig {
  // (Optional) Which ports (via an array) will the bridge start listening on?
  // Defaults to a single port 3000.
  ports?: Array<number>;
  // Must point to a valid Outbound Provider Method that conforms to
  // IOutboundProvider.
  outboundProvider: IOutboundProvider;
  // (Optional) A valid log4js logger to use for all output.
  // Defaults to no logging.
  logger?: ILogger;
  // (Optional) A number representing the timeout duration of any one
  // express request, in milliseconds.
  // Defaults to 30s
  requestTimeoutMs?: number;
  // Refer to https://github.com/expressjs/cors#configuration-options for
  // valid corsOptions. This uses the expressjs cors library. If not specified,
  // CORS will output with the most permissive headers possible
  // Access-Control-Allow-Origin: *
  corsOptions?: object;
  // Express Json Parsing Options
  jsonParsingOptions?: {
    /** When set to true, then deflated (compressed) bodies will be inflated; when false, deflated bodies are rejected. Defaults to true. */
    inflate?: boolean;
    /**
     * Controls the maximum request body size. If this is a number,
     * then the value specifies the number of bytes; if it is a string,
     * the value is passed to the bytes library for parsing. Defaults to '100kb'.
     */
    limit?: number | string;
    /**
     * The type option is used to determine what media type the middleware will parse
     * Default: application/json
     */
    type?: string | string[] | ((req: http.IncomingMessage) => any);
  };
}

export default CoronadoBridge;

export { IOutboundProvider, IProviderReq, BridgeError, OutboundResponse };
