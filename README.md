# Coronado Bridge

<p align="center">
  <img width="460" height="300" src="https://render.fineartamerica.com/images/rendered/square-dynamic/small/images/artworkimages/mediumlarge/1/coronado-bridge-with-sailboats-robert-gerdes.jpg">
</p>

[![CircleCI](https://circleci.com/gh/valtech-sd/coronado-bridge.svg?style=svg)](https://circleci.com/gh/valtech-sd/coronado-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Purpose

Coronado Bridge is a simple general purpose router of all HTTP requests. It will wrap all RESTful calls from external systems and pass those JSON message into a outbound provider.

### Why?

You might want to use `coronado-bridge` to avoid having to implicitly import Express and write all the Express boilerplate code and Express middleware to achieve similar functionality. With just a few lines of code, you can accomplish what would take maybe 30+ lines of Express boilerplate.

**Note:** If you already use Express in your application, this bridge might not be all that helpful to you. :]

## Outbound Provider

What is a outbound provider? An outbound provider is a class that implements a `handler` function. All incoming messages are routed through this function. This function must return a Promise and should resolve on success and reject on errors.

The `handler` function is passed a req object. The req object has the request body, request queries and request parameters.

**Example Request:**

- POST
- body: `{id: 1, name: Shane, page: 33}`
- URL: `/article/55?page=54&loc=USA`

Outbound Provider req Object:

```
{
  body: {id: 1, name: Shane, page: 33},
  query: {page:54, loc:'USA'},
  params: ['article', '55']
}
```

**Example Class:**

```
class OutboundConsole {
    handler(req) {
        // Returns a promise
        return new Promise((resolve, reject)=> {
            // Process the incoming req
            console.log(req)
            // Resolve the request
            resolve()
        })
    }
}
```

The above example is quite basic. You could implement a `handler` that processes the request and then communicates with an external API or system e.g. Message Queue, SMS, HTTP, SOAP etc.

_More examples can be found in `./examples` folder. Some are explained in more detail below._

# Getting Started

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 0.10 or higher is required.

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install coronado-bridge
```

## Import

```
//ES6
import CoronadoBridge from 'coronado-bridge'

//require
const CoronadoBridge = require('coronado-bridge')
```

The default export of the package is the CoronadoBridge object. When you initialize this it bootstraps and starts the application. The constructor requires a configuration object which is outlined below.

## Configuration

The package has some configuration options.

| Option           | type            | description                                                                  | required | default |
| ---------------- | --------------- | ---------------------------------------------------------------------------- | -------- | ------- |
| outboundProvider | `Class`         | This class is passed all requests and should implement a `handler` function. | YES      | N/A     |
| ports            | `Array<Number>` | The ports Express listens to for inbound messages.                           | NO       | 3000    |
| logger           | `log4js`        | An instance of a log4js logger                                               | NO       | N/A     |

**Example**:

```
import CoronadoBridge from 'coronado-bridge'
// Our outbound provider class which implements a
// handler function that writes messages to a file.
import OutboundFile from './providers/OutboundFile'

// Import our log4js logger
import logger from './providers/CustomLogger'

// Our outbound provider requires some configuration options.
const outboundFileConfig = {
    filePath: "./messages.json",
}

// CoronadoBridge configuration
const config = {
    ports: [3000,3002], // Start an express server on each port
    outboundProvider: new OutboundFile(outboundFileConfig), // Our outbound provider
    logger // log4js custom logger
}

new CoronadoBridge(config);
```

## Typescript

This package is built with typescript. If you are implementing this into a typescript project you can use the `ICoronadoBridgeConfig` interface to help you define the configuration object.

```
import CoronadoBridge, {ICoronadoBridgeConfig} from 'coronado-bridge'
import OutboundFile from './providers/OutboundFile'
import logger from './providers/CustomLogger'

const outboundFileConfig = {
    filePath: "./messages.json",
}

// Define the CoronadoBridge configuration with the help of
// the ICoronadoBridgeConfig interface.
const config: ICoronadoBridgeConfig = {
    ports: [3000,3002],
    outboundProvider: new OutboundFile(outboundFileConfig),
    logger,
}

new CoronadoBridge(config);
```

# Outbound Provider Examples

This section is a walkthrough of some of the examples found in `./examples`

## Typescript

If you are implementing this into a typescript project you can use the `IOutboundProvider` interface to help you define the outbound provider .

```
// import IOutboundProvider interface to
// help define the outbound provider class
import {IOutboundProvider} from 'coronado-bridge'

// Our outbound provider class implements the
// IOutboundProvider interface
class OutboundConsole implements IOutboundProvider {

    // The handler method receives a req and returns a Promise
    handler(req: object): Promise<void> {
        return new Promise((resolve, reject)=>{
            console.log(req)
            resolve()
        })
    }
}

export default OutboundConsole
```

## Error Handling

This package exports a CoronadoBridgeError class to handle errors in your outbound provider. The `constructor` requires two properties. A http status code and a error message.

```
// Import the CoronadoBridgeError class
import { IOutboundProvider, CoronadoBridgeError } from 'coronado-bridge';

export default class OutboundError implements IOutboundProvider {
  handler(req: object): Promise<void> {
    return new Promise((resolve, reject) => {

      const error = true;
      // Oh no! We have a error
      if (error) {

        // Create a new instance of CoronadoBridgeError
        const bridgeError = new CoronadoBridgeError(
          500, // status code
          'Flux capacitor not connected!' // Error message
        );

        // reject the promise with the error
        reject(bridgeError);
      }
    });
  }
}

```

## Outbound Custom File

The outbound custom file example is an extension of the OutboundFile outbound provider. It implements some message transformation based on the request query.

**Example Request**: `POST /?id=2&type=camera`

```
// Define expected message
interface IHandlerReq {
  query: {
    id: number;
    type: string;
  };
  body: any;
}

// Adds URL query to the body, and writes to a file, example POST /?id=1
export default class OutboundCustomFile implements IOutboundProvider {
  handler(req: IHandlerReq): Promise<void> {

    return new Promise((resolve, reject) => {
       let message = this.createMessage(req);

      // Use the write to file handler
      const outboundFile = new OutboundFile(outboundFileConfig);
      outboundFile
        .handler(message)
        .then(() => {
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  createMessage(req: IHandlerReq) {
    const id = req.query.id;
    const type = req.query.type;
    const location = this.getLocation(id);
    return { ...req.body, location, type };
  }
  getLocation(id: number) {
    const locations = ['Beach', 'Office', 'Hotel', 'Retail'];
    const location = locations[id];
    return location ? location : 'N/A';
  }
}
```

## Running Examples

To run some of the examples located in `./examples`, simple run the scripts outlined below. This section will also give you some quick curls to test them.

**Note:** Be sure to run `npm run bootstrap` before running any examples

### NPM Scripts

- `bootstrap`: Installs all dependencies and builds package/examples
- `build`: Builds the package and examples
- `build:package`: Builds the package
- `build:examples`: Builds the examples
- `file`: Runs the file example
- `console`: Runs the console example
- `error`: Runs the error example
- `file-js`: Runs the javascript only file example
- `custom-file`: Runs the custom file example

### Simple cURL - No query

Can be used with all examples

```
curl --location --request POST 'http://localhost:3000/' \
--header 'Content-Type: application/json' \
--data-raw '{
  "data": {
      "playerName": "Shane Mckenna",
      "avatar": "http://j2-442.amazon.s3.com/shane",
      "friend": "Dave"
  }
}
'
```

### Advanced cURL - With query

Can be used with the `custom-file` example

```
curl --location --request POST 'http://localhost:3000/?id=2&type=camera' \
--header 'Content-Type: application/json' \
--data-raw '{
  "data": {
      "playerName": "Shane Mckenna",
      "avatar": "http://j2-442.amazon.s3.com/shane",
      "friend": "Dave"
  }
}
'
```

# Development

Be sure to read our `CONTRIBUTING.md` before starting development.

## Project Structure

The root directory consist of the following:

- .circleci - This is the config for CircleCI for automatic deploys of the browser app to servers.
- examples - node project with examples
- src - source code
- tests - Mocha tests
- `.prettierrc` - prettier configuration
- `CONTRIBUTING.md` - short guide to how you can help with this project
- `package.json` - package dependencies, scripts etc.
- `README.md` - This file
- `tsconfig.json` - Typescript settings

## NPM Scripts

**Note:** Be sure to run `npm install` after you clone the project.

- `build` - Builds the CoronadoBridge package
- `test:unit` - Runs the unit tests using Mocha

## TypeScript

This project uses TypeScript, learn more about it [here](https://www.typescriptlang.org/docs/home.html).

## Code Formatting

This project uses [Prettier](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#formatting-code-automatically), an opinionated automatic code formatter. Whenever you make a commit, Prettier will format the changed files automatically.

You probably want to integrate Prettier in your favorite editor. Read the section on [Editor Integration](https://github.com/prettier/prettier#editor-integration) on the Prettier GitHub page.

## CI and CD

This project leverages [CircleCI](https://circleci.com/) for continuous integration (CI) and continuous deployment (CD).

Settings for CircleCI should be adjusted in the configuration file at `.circleci/config.yml` and not on the website for CircleCI.
