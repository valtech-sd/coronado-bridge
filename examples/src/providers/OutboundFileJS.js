const { OutboundResponse, BridgeError } = require('coronado-bridge');

// Package Dependencies
const fs = require('fs');

class OutboundFileJS {
  constructor(config, logger) {
    this.filePath = config.filePath;
    this.logger = logger;
  }

  handler(request) {
    return new Promise((resolve, reject) => {
      fs.appendFile(
        this.filePath,
        JSON.stringify(request) + '\n',
        'utf-8',
        (err) => {
          if (err) throw new BridgeError(500, err.message, 'output handler error');
          this.logger.info('Message written to file!');
          // Create a response
          const structuredResponse = new OutboundResponse(
            { result: 'A-OK!' },
            203,
            { 'some-header': 'some-value' }
          );
          // Resolve with the structured response which passes it to the client
          resolve(structuredResponse);
        }
      );
    });
  }
}

module.exports = OutboundFileJS;
