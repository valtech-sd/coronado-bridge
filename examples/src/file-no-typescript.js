import CoronadoBridge from 'coronado-bridge';
import logger from './providers/CustomLogger';
/*
 * Import the outbound provider we want to use:
 * In this case we are using the OutboundFile provider.
 * This provider comes with a configuration interface,
 * BUT we are not using typescript so we will not import it.
 */
import OutboundFile from './providers/OutboundFile';

/*
 * OutboundProvider Config.
 * We must ensure we are implementing the correct
 * config properties by referencing the OutboundFile class
 */

const outboundFileConfig = {
  filePath: './messages.json',
};

/*
 * Define the CoronadoBridge configuration.
 * We must ensure we are implementing the correct
 * config properties by referencing the package readme.
 */
const config = {
  ports: [3000, 3002],
  logger,
  outboundProvider: new OutboundFile(outboundFileConfig),
};

new CoronadoBridge(config);
