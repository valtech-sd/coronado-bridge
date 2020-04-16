import fs from 'fs';

class OutboundFileJS {
  constructor(config) {
    this.filePath = config.filePath;
  }

  handler(message) {
    return new Promise((resolve, reject) => {
      let messages = [];
      fs.exists(this.filePath, exists => {
        if (exists) {
          const data = fs.readFileSync(this.filePath, 'utf-8');
          if (data) {
            messages = JSON.parse(data);
          }
        }
        messages.push(message);
        fs.writeFile(this.filePath, JSON.stringify(messages), 'utf-8', err => {
          if (err) throw err;
          console.log('Message written to file!');
          resolve();
        });
      });
    });
  }
}

export default OutboundFileJS;
