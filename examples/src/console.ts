import CoronadoBridge, { IBridgeConfig } from 'coronado-bridge';
import logger from './providers/CustomLogger';
/*
 * Import the outbound provider we want to use:
 * In this case we are using the OutboundConsole provider.
 * This provider does not have any configuration.
 */
import OutboundConsole from './providers/OutboundConsole';

/*
 * Define the CoronadoBridge configuration with the help of the IBridgeConfig interface.
 * Note: This config does not have the outboundProviderConfig property
 * as our provider has no configuration options.
 */
const config: IBridgeConfig = {
  ports: [3000, 3002],
  logger,
  outboundProvider: new OutboundConsole(),
};

new CoronadoBridge(config);
