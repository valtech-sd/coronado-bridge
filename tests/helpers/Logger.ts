import log4js from 'log4js';

let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');
logger.level = 'off';

export default logger;
