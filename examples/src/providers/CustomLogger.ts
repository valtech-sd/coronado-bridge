import log4js from 'log4js';

let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');
logger.level = 'info';

export default logger;
