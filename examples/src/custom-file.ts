import CoronadoBridge, { IBridgeConfig } from 'coronado-bridge';
import logger from './providers/CustomLogger';
/*
 * Import the outbound provider we want to use:
 * In this case we are using the OutboundCustomFile provider.
 * This provider does not have any configuration.
 */
import OutboundCustomFile from './providers/OutboundCustomFile';

/*
 * Define the CoronadoBridge configuration with the help of the IBridgeConfig interface.
 * Note: This config does not have the outboundProviderConfig property
 * as our provider has no configuration options.
 */
const config: IBridgeConfig = {
  ports: [3000, 3002],
  logger,
  outboundProvider: new OutboundCustomFile(logger),
};

new CoronadoBridge(config);
