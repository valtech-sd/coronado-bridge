const { default: CoronadoBridge } = require('coronado-bridge');

// Setup a logger
const log4js = require('log4js');
let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');
logger.level = 'all';

/*
 * Import the outbound provider we want to use:
 * In this case we are using the OutboundFile provider.
 * This provider comes with a configuration interface,
 * BUT we are not using typescript so we will not import it.
 */
const OutboundFileJS = require('./providers/OutboundFileJS');

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
  outboundProvider: new OutboundFileJS(outboundFileConfig, logger),
};

new CoronadoBridge(config);
