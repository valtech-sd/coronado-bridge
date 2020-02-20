import CoronadoBridge, { IBridgeConfig } from 'coronado-bridge';
import logger from './providers/CustomLogger';

/*
 * Import the outbound provider we want to use:
 * In this case we are using the OutboundFile provider.
 * This provider comes with a configuration interface,
 * This is used to help us define our config correctly.
 */
import OutboundFile, { IOutboundFileConfig } from './providers/OutboundFile';

/*
 * OutboundProvider Config implementing our OutboundProvider config interface.
 * In this case it tells us we need the following properties:
 * filePath: string
 */

const outboundFileConfig: IOutboundFileConfig = {
  filePath: './messages.json',
};

/*
 * Define the CoronadoBridge configuration with the help of the IBridgeConfig interface.
 */
const config: IBridgeConfig = {
  ports: [3000, 3002],
  logger,
  outboundProvider: new OutboundFile(outboundFileConfig),
};

new CoronadoBridge(config);
