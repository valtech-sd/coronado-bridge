import CoronadoBridge from './bridge';
import { Logger } from 'log4js';

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
  logger?: Logger;
  // (Optional) A number representing the timeout duration of any one
  // express request, in milliseconds.
  // Defaults to 30s
  requestTimeoutMs?: number;
  // Refer to https://github.com/expressjs/cors#configuration-options for
  // valid corsOptions. This uses the expressjs cors library.
  corsOptions?: object;
}

export default CoronadoBridge;

export { IOutboundProvider, IProviderReq, BridgeError, OutboundResponse };
