# Coronado Bridge

<p align="center">
  <img height='300' src="./assets/coronado_bridge_2.png">
</p>

[![CircleCI](https://circleci.com/gh/valtech-sd/coronado-bridge.svg?style=svg)](https://circleci.com/gh/valtech-sd/coronado-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Purpose

Coronado Bridge is a simple general purpose router of HTTP requests. It does this by starting up an Express server
with a default route that accepts all requests. Then, when requests come in, they are parsed out and wrapped into a
JSON object, then passes this JSON object into an outbound provider (a class with logic of your choice that performs
additional processing.) The outbound provider can also respond to the request, and this response is delivered back to
Express for response back to the http client.

### Why?

You might want to use `coronado-bridge` to avoid having to implicitly import Express and write all the Express
boilerplate code and Express middleware to achieve similar functionality. With just a few lines of code, you can
accomplish what might require a good amount of Express boilerplate.

**Note:** If you already use Express in your application, and are very familiar with Express, this bridge might not be
all that helpful to you. :]

## Outbound Provider

What is a outbound provider? An outbound provider is a class that implements a **IOutboundProvider** and provides a
`handler()` method. All incoming http requests are passed into this function for handling. This function must return a
Promise and should resolve on success and reject on errors. The promise returned is used to respond to the original
http request.

The `handler()` method is passed a `req` object (of type **IProviderReq**). The `req` object has the request method,
body, query string, request parameters (the path of the URL requested), and request headers.

**Example Request:**

- POST
- body: `{id: 1, name: Shane, page: 33}`
- URL: `/article/55?page=54&loc=USA`
- headers: `content-type: application/json`

Outbound Provider `req` Object:

```javascript
{
  method: 'POST',
  body: {id: 1, name: Shane, page: 33},
  query: {page: 54, loc: 'USA'},
  params: ['article', '55']
  headers: {
    content-type: 'application/json'
  }
}
```

Coronado Bridge accepts `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, and ignores all other HTTP methods. In fact, `OPTIONS`
is passed onto a CORS handler but not much else, in order to handle pre-flight of AJAX requests properly.

**Example IOutboundProvider Class and handler method:**

```javascript
class OutboundConsole {
  handler(req) {
    // Returns a promise
    return new Promise((resolve, reject) => {
      // Process the incoming req
      console.log(req);
      // Resolve with a response object to pass that back to the
      // http request. You can also return a string instead!
      resolve({ someitem: 'somevalue' });
    });
  }
}
```

The above class will return the following to every request (and http status = 200):

```json
{
  "some-item": "some-value"
}
```

The above example is quite basic. You could implement a `handler()` that processes the request and then communicates
with an external API or system e.g. Message Queue, SMS, HTTP, SOAP etc.

_More examples can be found in `./examples` folder. Some are explained in more detail below._

### Responding to Requests

Coronado Bridge automatically responds to the HTTP request with whatever the `handler()` method resolves (or rejects)
with. The bridge will automatically respond with http status = 200 and either an object or a primitive you return
from the handler. However, in most cases you want to control more than this. For example, you may want to set the
response code, and control the headers that are sent back to the response.

For this, you can return the special object confirming to **OutboundResponse**. That object has the following structure:

- body: an object to be returned in the body of the response.
- status: a number to be set as the HTTP status for the response.
- headers?: an object of key-value pairs to be sent in the HTTP response as headers.

Here is a handler that uses this response object.

```typescript
import {
  IOutboundProvider,
  IProviderReq,
  OutboundResponse,
} from 'coronado-bridge';

export default class OutboundConsoleStructuredResponse
  implements IOutboundProvider
{
  handler(req: IProviderReq): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a structured response object so we can control HTTP response code and more...
      const structuredResponse = new OutboundResponse(
        { response: 'OK!', yourRequest: req },
        201
      );
      // Resolve with the object.
      resolve(structuredResponse);
    });
  }
}
```

Similarly, here is a handler in JavaScript.

```javascript
const { OutboundResponse } = require('coronado-bridge');

class OutboundFileJS {
  handler(message) {
    return new Promise((resolve, reject) => {
      // Create a response
      const structuredResponse = new OutboundResponse(
        { result: 'A-OK!' },
        203,
        { 'some-header': 'some-value' }
      );
      // Resolve with the structured response which passes it to the client
      resolve(structuredResponse);
    });
  }
}

module.exports = OutboundFileJS;
```

# Getting Started

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/). Review the file .nvmrc for the
recommended version of NodeJS to use.

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install coronado-bridge -s
```

## Import / Require

Depending on the NodeJS flavor you're using, you can import the package as follows.

```js
// ES6
import {
  IOutboundProvider,
  IProviderReq,
  OutboundResponse,
} from 'coronado-bridge';

// require
const {
  default: CoronadoBridge,
  OutboundResponse,
  BridgeError,
} = require('coronado-bridge');
```

The default export of the package is the CoronadoBridge object. When you initialize this, it bootstraps and starts the
application. The constructor requires a configuration object which is outlined below.

## Coronado Bridge Configuration

The package has some configuration options.

| Option           | Type                                          | Description                                                                                                                                                                                                     | Required | Default                                                                           |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| outboundProvider | A class that conforms to `IOutboundProvider`. | This class is passed all requests and should implement a `handler` method that determines what to do with the request. It is here that you insert your logic, call other systems, etc.                          | YES      | N/A                                                                               |
| ports            | `Array<number>`                               | An array with one or more port numbers that the HTTP Server will listen for requests on.                                                                                                                        | NO       | 3000                                                                              |
| logger           | `ILogger`                                     | An logger instance.                                                                                                                                                                                             | NO       | N/A                                                                               |
| requestTimeoutMs | `Number`                                      | A duration (number in milliseconds) that determines how long an Outbound Provider for an HTTP request is allowed to execute before the HTTP client is sent a timeout response.                                  | NO       | 30s                                                                               |
| corsOptions      | `object`                                      | Allows the bridge instance to control CORS headers. The option should be an object conforming to the structure documented in Express' CORS module. See https://github.com/expressjs/cors#configuration-options. | NO       | CORS headers will be set to the most permissive `Access-Control-Allow-Origin: *`. |

**Example**:

```js
const {
  default: CoronadoBridge,
  OutboundResponse,
} = require('coronado-bridge');

// Setup a logger
const log4js = require('log4js');
let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');
logger.level = 'all';

class OutboundFileJS {
  handler(message) {
    return new Promise((resolve, reject) => {
      // Create a response
      const structuredResponse = new OutboundResponse(
        { result: 'A-OK!' },
        203,
        { 'some-header': 'some-value' }
      );
      // Resolve with the structured response which passes it to the client
      resolve(structuredResponse);
    });
  }
}

const config = {
  // Listens on one or more ports, ports 3000 + 3002 in this case
  ports: [3000, 3002],
  // Passes a reference to a log4js Logger
  logger,
  // Wires in an outbound provider
  outboundProvider: new OutboundFileJS(),
  // 5 second timeout
  requestTimeoutMs: 5000,
  // control CORS
  corsOptions: {
    // Restricts requests from a specific origin only
    origin: 'https://yourapp.somedomain.com/',
    // Allows GET and POST only
    methods: ['GET', 'POST'],
  },
};

new CoronadoBridge(config);
```

## Typescript

This package is built in typescript. If you are implementing this into a typescript project you can use the `ICoronadoBridgeConfig`
interface to help you define the configuration object.

```ts
import CoronadoBridge, { IBridgeConfig } from 'coronado-bridge';

// Define the CoronadoBridge configuration with the help of
// the IBridgeConfig interface.
const config: IBridgeConfig = {
  // Listens on one or more ports, ports 3000 + 3002 in this case
  ports: [3000, 3002],
  // Passes a reference to a log4js Logger
  logger,
  // Wires in an outbound provider
  outboundProvider: new OutboundFileJS(),
  // 5 second timeout
  requestTimeoutMs: 5000,
  // control CORS
  corsOptions: {
    // Restricts requests from a specific origin only
    origin: 'https://yourapp.somedomain.com/',
    // Allows GET and POST only
    methods: ['GET', 'POST'],
  },
};

new CoronadoBridge(config);
```

# Outbound Provider Examples

This section is a walkthrough of some of the examples found in `./examples`. Please see the examples themselves for more
details.

## Typescript

If you are implementing this into a typescript project you can use the `IOutboundProvider` interface to help you define
the outbound provider (and the `IProviderReq` interface to define the object passed in to the provider).

```ts
// import IOutboundProvider interface to
// help define the outbound provider class
import {
  IOutboundProvider,
  IProviderReq,
  OutboundResponse,
} from 'coronado-bridge';

// Our outbound provider class implements the
// IOutboundProvider interface
class OutboundConsole implements IOutboundProvider {
  // The handler method receives a req and returns a Promise
  handler(req: IProviderReq): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a structured response object so we can control HTTP response code and more...
      const structuredResponse = new OutboundResponse(
        { response: 'OK!', yourRequest: req },
        201
      );
      // Resolve with the object.
      resolve(structuredResponse);
    });
  }
}

export default OutboundConsole;
```

You can also return an object or other primitive from an outbound provider's Promise:

```ts
// import IOutboundProvider interface to
// help define the outbound provider class
import { IOutboundProvider, IProviderReq } from 'coronado-bridge';

// Our outbound provider class implements the
// IOutboundProvider interface
class OutboundConsole implements IOutboundProvider {
  // The handler method receives a req and returns a Promise
  handler(req: IProviderReq): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(req);
      resolve(
        'Some useful return here. Could also be an object instead of a string!'
      );
    });
  }
}
```

## Error Handling

This package exports a BridgeError class to handle errors in your outbound provider. The `constructor` requires two
properties: an http status code, and an error message. It can also accept an error name!

```ts
// Import the CoronadoBridgeError class
import { IOutboundProvider, BridgeError } from 'coronado-bridge';

export default class OutboundError implements IOutboundProvider {
  handler(req: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const error = true;
      // Oh no! We have a error
      if (error) {
        // Create a new instance of CoronadoBridgeError
        const bridgeError = new BridgeError(
          500, // status code
          'Flux capacitor not connected!', // Error message
          'Error-Name-Here' // Optional Error Name
        );

        // reject the promise with the error
        reject(bridgeError);
      }
    });
  }
}
```

## Running The Examples

To run the examples located in `./examples`, simple run the scripts outlined below. This section will also give you
some quick curls to test them.

**Note:** Be sure to run `npm run bootstrap` before running any examples

### NPM Scripts

- `bootstrap`: Installs all dependencies and builds package/examples.
- `build`: Builds the package and examples.
- `build:package`: Builds the package.
- `build:examples`: Builds the examples.
- `file`: Runs the file example (Typescript).
- `console`: Runs the console example (Typescript).
- `console-alternate`: Runs an alternate console example that demonstrates returning structed output back to the HTTP
  request. (Typescript).
- `error`: Runs the error example (Typescript).
- `file-javascript-only`: Runs a javascript version of the file example.
- `custom-file`: Runs the custom file example (Typescript).

### Simple cURL - No query

Can be used with all examples

```bash
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

```bash
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
- `.nvmrc` - holds the NodeJS version number that is recommended for the project
- `CONTRIBUTING.md` - short guide to how you can help with this project
- `LICENSE.md` - package license information
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
