import 'mocha';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import express from 'express';

import CoronadoBridge, {
  IOutboundProvider,
  BridgeError,
  OutboundResponse,
  IProviderReq,
  IBridgeConfig,
} from '../../src/index';
import log4jsLogger from '../helpers/Log4js-Logger';
import tsLogger from '../helpers/ts-Logger';
import Simple from 'simple-mock';

chai.use(chaiHttp);

// TEST CONSTANTS

interface ITestConfig {
  testProp: string;
}

const providerConfig: ITestConfig = {
  testProp: 'Test construction',
};

const TEST_HEADERS = {
  'custom-header': 'Hello!',
  'custom-other': 'Goodbye.',
};

const TEST_PORT_1 = 3000;
const TEST_PORT_2 = 3001;
const TEST_PORT_3 = 3002;
const TEST_PORT_4 = 3003;

/**
 * TEST SUITE
 */

describe('HTTP Bridge', function () {
  afterEach(() => {
    Simple.restore();
  });
  it('Initializes with log4js', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    expect(bridge).to.not.be.undefined;
    //cleanup
    bridge.close();
    done();
  });
  
  it('Passes json parsing options to express.json', (done: () => void) => {
    const jsonParsingOptions = { limit: 1000 };
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
      jsonParsingOptions
    };
    const spy = Simple.mock(express, 'json');
    const bridge = new CoronadoBridge(config);
    expect(spy.lastCall?.args?.[0]).to.equal(jsonParsingOptions);
    //cleanup
    bridge.close();
    done();
  });

  it('Initializes tslog', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1],
      tsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    expect(bridge).to.not.be.undefined;
    //cleanup
    bridge.close();
    done();
  });

  it('Initializes with no logger', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1],
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    expect(bridge).to.not.be.undefined;
    //cleanup
    bridge.close();
    done();
  });

  it('Creates server on port 3000', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    testServerPostApplicationJsonBody(TEST_PORT_1).then((res) => {
      expect(res).to.have.status(200);
      //cleanup
      bridge.close();
      done();
    });
  });

  it('Closes server', (done: () => void) => {
    let firstSeverCallWasSuccessful = false;

    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    testServerPostApplicationJsonBody(TEST_PORT_1)
      .then((res) => {
        expect(res).to.have.status(200);
        firstSeverCallWasSuccessful = true;
      })
      .then(() => {
        bridge.close();
        return testServerPostApplicationJsonBody(TEST_PORT_1);
      })
      .then((res) => {
        expect(res).to.not.exist;
      })
      .catch((err) => {
        expect(firstSeverCallWasSuccessful).to.equal(true);
        expect(err).to.exist;
        done();
      });
  });

  it('Creates multiple servers', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1, TEST_PORT_2, TEST_PORT_3, TEST_PORT_4],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);

    let testPromises: Array<Promise<any>> = [];

    config.ports.forEach((port) => {
      testPromises.push(
        testServerPostApplicationJsonBody(port).then((res) => {
          expect(res).to.have.status(200);
        })
      );
    });

    Promise.all(testPromises).then(() => {
      bridge.close();
      done();
    });
  });

  it('Handles Errors', (done: () => void) => {
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestErrorProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);

    let testPromises: Array<Promise<any>> = [];

    config.ports.forEach((port) => {
      testPromises.push(
        testServerPostApplicationJsonBody(port).then((res) => {
          expect(res.body.error).to.have.status(500);
          expect(res.body.error.message).to.exist;
        })
      );
    });

    Promise.all(testPromises).then(() => {
      bridge.close();
      done();
    });
  });

  it('Properly handles timeout', async () => {
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestErrorTimeoutProvider(),
      requestTimeoutMs: 100, // Requests will timeout quickly
    };
    const bridge = new CoronadoBridge(config);
    try {
      let res = await testServerPostApplicationJsonBody(TEST_PORT_1);
      expect(res).to.have.status(408);
    } finally {
      // Cleanup
      bridge.close();
    }
  });

  /************
   * Test to make sure output provider receives good request including
   * parsing application/json body data.
   *
   * 1. Setup coronado bridge.
   * 2. Make a test call and pass in body, path, and query params
   * 3. Make sure status is valid
   * 4. Make sure the output provider receives the same dta we did an http call with
   ************/
  it('Correct application/json body passed to outbound provider', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    try {
      let body = { testBodyData: 'test' };
      let params = ['param1', 'param2', 'param3', 'param4'];
      let query = { foo: 'bar' };
      // 2. Make a test call and pass in body, path, and query params
      let res = await testServerPostApplicationJsonBody(TEST_PORT_1, {
        path: `/${params.join('/')}`,
        body,
        query,
      });

      // 3. Make sure status is valid
      expect(res).to.have.status(200);

      // 4. Make sure the output provider receives the same data we passed in the
      //    http call plus the expected response headers from express.
      let headers = {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        'content-length': JSON.stringify(body).length.toString(),
        'content-type': 'application/json',
        host: 'localhost:3000',
        'user-agent': 'node-superagent/3.8.3',
      };
      // Check to ensure what we passed to the Outbound Provider is correct
      // Note we're reaching into the outboundProvider instance, which is not
      // a usual pattern for an actual use of this library, but it's fine for
      // testing.
      expect((config.outboundProvider.requestArray || [])[0]).to.deep.equal({
        body,
        headers,
        params,
        query,
        method: 'POST',
      });
    } finally {
      bridge.close();
    }
  });

  /************
   * Test to make sure output provider receives good request including
   * parsing text/plain body data.
   *
   * 1. Setup coronado bridge.
   * 2. Make a test call and pass in body, path, and query params
   * 3. Make sure status is valid
   * 4. Make sure the output provider receives the same dta we did an http call with
   ************/
  it('Correct text/plain body passed to outbound provider', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    // Setup what we're going to request with
    try {
      let body = 'just text';
      let params = ['param1', 'param2', 'param3', 'param4'];
      let query = { foo: 'bar' };

      // 2. Make a test call and pass in body, path, and query params
      let res = await testServerPostTextPlainBody(TEST_PORT_1, {
        path: `/${params.join('/')}`,
        body,
        query,
      });

      // 3. Make sure the response status is as expected
      expect(res).to.have.status(200);

      // 4. Make sure the output provider receives the same data we passed in the
      //    http call plus the expected response headers from express.
      let headers = {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        'content-length': `${body.length}`,
        'content-type': 'text/plain',
        host: 'localhost:3000',
        'user-agent': 'node-superagent/3.8.3',
      };
      // Check to ensure what we passed to the Outbound Provider is correct
      // Note we're reaching into the outboundProvider instance, which is not
      // a usual pattern for an actual use of this library, but it's fine for
      // testing.
      expect((config.outboundProvider.requestArray || [])[0]).to.deep.equal({
        body,
        headers,
        params,
        query,
        method: 'POST',
      });
    } finally {
      bridge.close();
    }
  });

  /************
   * Test to make sure output provider responds with a structured object
   * 1. Setup coronado bridge.
   * 2. Make a test call and pass in body, path, and query params
   * 3. Make sure status is as set by the special provider
   * 4. Make sure the output provider responds with a custom header and structured
   *    body output.
   ************/
  it('Correct structured output from the outbound provider', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProviderWithStructuredResponse(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    try {
      let body = { testBodyData: 'test' };
      let params = ['param1', 'param2', 'param3', 'param4'];
      let query = { foo: 'bar' };
      // 2. Make a test call and pass in body, path, and query params
      // Note, this responds with a CHAI-HTTP response object which has a lot
      // of items we don't necessarily care for NOR are normal in a
      // regular call.
      let res = await testServerPostApplicationJsonBody(TEST_PORT_1, {
        path: `/${params.join('/')}`,
        body,
        query,
      });

      // 3. Make sure status is as set by the special provider
      expect(res).to.have.status(203);

      // 4. Make sure the output provider receives the same data we passed in the
      //    http call plus the expected response headers from express.

      // Note, 'res' is a CHAI-HTTP response object which has a lot
      // of items we don't necessarily care for NOR are normal in a
      // regular call. However it does incorporate our embedded OutboundResponse
      // so we check for those items we care about specifically.
      expect(res.body).to.deep.equal(body);
      // Look for the specific headers we added to the outbound response
      let headerKeys = Object.keys(TEST_HEADERS);
      headerKeys.forEach((key, index) => {
        // Not sure why Typescript does not want to compile this next
        // statement, because it runs perfect inside MOCHA!
        //@ts-ignore
        expect(res.headers[key]).to.deep.equal(TEST_HEADERS[key]);
      });
    } finally {
      bridge.close();
    }
  });

  /************
   * Test to make sure cors will work (default CORS)
   * The main way I know to test this is to make sure OPTION is handled
   * 1. Setup coronado bridge.
   * 2. Make a test call using http OPTION
   * 3. Make sure status is valid
   * 4. Check for the CORS headers (the default ones that allow ALL)
   ************/
  it('Test Cors Default using option request', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [TEST_PORT_1],
      log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    try {
      // 2. Make a test call using http OPTION
      let res = await testServerOptions(TEST_PORT_1);

      // 3. Make sure status is valid (an OPTIONS returns no content
      //    so we expect http status 204).
      expect(res).to.have.status(204);
      // 4. Check for the CORS headers (the default ones that allow ALL)
      expect(res.headers['access-control-allow-origin']).to.equal('*');
      expect(res.headers['access-control-allow-methods']).to.equal(
        'GET,HEAD,PUT,PATCH,POST,DELETE'
      );
    } finally {
      bridge.close();
    }
  });

  /************
   * Test to make sure cors will work (CUSTOM CORS)
   * The main way I know to test this is to make sure OPTION is handled
   * 1. Setup coronado bridge.
   * 2. Make a test call using http OPTION
   * 3. Make sure status is valid
   * 4. Check for the CORS headers (the default ones that allow ALL)
   ************/
  it('Test Cors Custom using option request', async () => {
    // 1. Setup coronado bridge.
    const config: IBridgeConfig = {
      ports: [TEST_PORT_1],
      logger: log4jsLogger,
      outboundProvider: new TestProvider(providerConfig),
      // In this test we include some corsOptions that we expect
      // the Coronado to pass to the underlying express cors handler.
      // Valid options documented here: https://github.com/expressjs/cors#configuration-options
      corsOptions: {
        origin: 'http://localhost',
        methods: ['OPTIONS'],
      },
    };
    const bridge = new CoronadoBridge(config);
    try {
      // 2. Make a test call using http OPTION
      let res = await testServerOptions(TEST_PORT_1);

      // 3. Make sure status is valid (an OPTIONS returns no content
      //    so we expect http status 204).
      expect(res).to.have.status(204);
      // 4. Check for the CORS headers (the default ones that allow ALL)
      expect(res.headers['access-control-allow-origin']).to.equal(
        'http://localhost'
      );
      expect(res.headers['access-control-allow-methods']).to.equal('OPTIONS');
    } finally {
      bridge.close();
    }
  });

  /**
   * Test Outbound Providers
   */

  /**
   * This Outbound Provider saves the received requests to an instance array.
   * With this, we can then check to make sure the provider was passed what we
   * expected and not worry about what the provider returns!
   */
  class TestProvider implements IOutboundProvider {
    // An array to hold messages received, though
    // we really expect just one per test!
    public requestArray: any[];

    constructor(config: ITestConfig) {
      // verify we received a property passed in
      expect(config.testProp).to.exist;
      // Initialize the requests array
      this.requestArray = [];
    }

    handler(requestFromBridge: object): Promise<void> {
      return new Promise((resolve, reject) => {
        // Make sure we received a request object
        expect(requestFromBridge).to.exist;
        // Push it to the instance array so we can later check it from a test.
        this.requestArray.push(requestFromBridge);
        // Resolve, not important what we resolve with!
        resolve();
      });
    }
  }

  /**
   * This Outbound Provider uses the received request to construct a
   * structured OutboundResponse. We use this handler not to directly
   * check what it receives, but rather that the OutboundResponse
   * is properly formed (including headers, response code, etc.)
   */
  class TestProviderWithStructuredResponse implements IOutboundProvider {
    constructor(config: ITestConfig) {}

    handler(requestFromBridge: IProviderReq): Promise<OutboundResponse> {
      return new Promise((resolve, reject) => {
        expect(requestFromBridge).to.exist;
        // Create an OutboundResponse
        let structuredResponse: OutboundResponse = new OutboundResponse(
          requestFromBridge.body,
          203,
          TEST_HEADERS
        );
        // Pass the OutboundResponse object we've created
        resolve(structuredResponse);
      });
    }
  }

  /**
   * A provider that purposely fires off an error so we can check for it
   * being handled properly.
   */
  class TestErrorProvider implements IOutboundProvider {
    constructor(config: ITestConfig) {
      expect(config.testProp).to.exist;
    }

    handler(message: object): Promise<void> {
      return new Promise((resolve, reject) => {
        // Just fire an error
        const error = new BridgeError(500, 'Whoops, something went wrong!');
        reject(error);
      });
    }
  }

  /**
   * A provider that purposely never resolves to cause a timeout.
   */
  class TestErrorTimeoutProvider implements IOutboundProvider {
    handler(message: object): Promise<void> {
      return new Promise((resolve, reject) => {
        // We just want this to be slow so it never resolves
        // A bridge using this should time out!
      });
    }
  }

  /**
   * Fake HTTP calls to the Express Server using Chai-Http
   */

  /**
   * Makes a call to the HTTP Express Server POSTING a JSON BODY
   *
   * @param port - the port to make the request on
   * @param path - the path for the request
   * @param body - expected to be an object
   * @param query - any query string items for the request
   */
  function testServerPostApplicationJsonBody(
    port: number,
    { path, body, query }: { path: string; body: any; query?: any } = {
      path: '/',
      body: { name: 'Shane' },
      query: {},
    }
  ): Promise<any> {
    return chai
      .request(`http://localhost:${port}`)
      .post(path)
      .query(query)
      .type('application/json')
      .send(body);
  }

  /**
   * Makes a call to the HTTP Express Server POSTING a TEXT BODY
   *
   * @param port - the port to make the request on
   * @param path - the path for the request
   * @param body - expected to be a string.
   * @param query - any query string items for the request
   */
  function testServerPostTextPlainBody(
    port: number,
    { path, body, query }: { path: string; body: string; query?: any } = {
      path: '/',
      body: 'some default text',
      query: {},
    }
  ): Promise<any> {
    return chai
      .request(`http://localhost:${port}`)
      .post(path)
      .query(query)
      .type('text/plain')
      .send(body); // body is a string in this one!
  }

  /**
   * Makes a call to the HTTP Express Server using an OPTIONS call
   *
   * @param port - the port to make the request on
   * @param path - the path for the request
   * @param body - expected to be an object
   * @param query - any query string items for the request
   */
  function testServerOptions(
    port: number,
    { path, body, query }: { path: string; body: any; query?: any } = {
      path: '/',
      body: { name: 'Shane' },
      query: {},
    }
  ): Promise<any> {
    return (
      chai
        .request(`http://localhost:${port}`)
        // Note this makes an OPTIONS instead of POST|GET
        .options(path)
        .query(query)
        .type('application/json')
        .send(body)
    );
  }
});
