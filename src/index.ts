import CoronadoBridge from './bridge';
import { Logger } from 'log4js';

import { IOutboundProvider } from './provider';

import BridgeError from './bridge-error';

export interface IBridgeConfig {
  ports?: Array<number>;
  outboundProvider: IOutboundProvider;
  logger?: Logger;
}

export default CoronadoBridge;

export { IOutboundProvider, BridgeError };
