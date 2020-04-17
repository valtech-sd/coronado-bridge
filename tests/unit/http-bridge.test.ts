import 'mocha';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import CoronadoBridge, {
  IOutboundProvider,
  BridgeError,
} from '../../src/index';
import logger from '../../examples/src/providers/CustomLogger';

chai.use(chaiHttp);

interface ITestConfig {
  testProp: string;
}

const providerConfig: ITestConfig = {
  testProp: 'Test construction',
};

class TestProvider implements IOutboundProvider {
  public messages: any[];

  constructor(config: ITestConfig) {
    expect(config.testProp).to.exist;
    this.messages = [];
  }

  handler(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      expect(message).to.exist;
      this.messages.push(message);
      resolve();
    });
  }
}

class TestErrorProvider implements IOutboundProvider {
  constructor(config: ITestConfig) {
    expect(config.testProp).to.exist;
  }

  handler(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const error = new BridgeError(500, 'Whoops, something went wrong!');
      reject(error);
    });
  }
}

describe('HTTP Bridge', function () {
  it('Initializes', (done: () => void) => {
    const config = {
      ports: [3000],
      logger,
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
      ports: [3000],
      logger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    testServerPort(3000).then((res) => {
      expect(res).to.have.status(200);
      //cleanup
      bridge.close();
      done();
    });
  });

  it('Closes server', (done: () => void) => {
    let firstSeverCallWasSuccessful = false;

    const config = {
      ports: [3000],
      logger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    testServerPort(3000)
      .then((res) => {
        expect(res).to.have.status(200);
        firstSeverCallWasSuccessful = true;
      })
      .then(() => {
        bridge.close();
        return testServerPort(3000);
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
      ports: [3000, 3001, 3002, 3003],
      logger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);

    let testPromises: Array<Promise<any>> = [];

    config.ports.forEach((port) => {
      testPromises.push(
        testServerPort(port).then((res) => {
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
      ports: [3000],
      logger,
      outboundProvider: new TestErrorProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);

    let testPromises: Array<Promise<any>> = [];

    config.ports.forEach((port) => {
      testPromises.push(
        testServerPort(port).then((res) => {
          expect(res).to.have.status(500);
          expect(res.body.message).to.exist;
        })
      );
    });

    Promise.all(testPromises).then(() => {
      bridge.close();
      done();
    });
  });

  /************
   * Test to make sure output provider recieves good data
   * 1. Setup coronado bridge.
   * 2. Make a test call and pass in body, path, and query params
   * 3. Make sure status is valid
   * 4. Make sure the output provider recieves the same dta we did an http call with
   ************/
  it('Correct data in output provider', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [3000],
      logger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    try {
      let body = { testBodyData: 'test' };
      let params = ['param1', 'param2', 'param3', 'param4'];
      let query = { foo: 'bar' };
      // 2. Make a test call and pass in body, path, and query params
      let res = await testServerPort(config.ports[0], {
        path: `/${params.join('/')}`,
        body,
        query,
      });

      // 3. Make sure status is valid
      expect(res).to.have.status(200);

      // 4. Make sure the output provider recieves the same dta we did an http call with
      expect((config.outboundProvider.messages || [])[0]).to.deep.equal({
        body,
        params,
        query,
        method: 'POST',
      });
    } finally {
      bridge.close();
    }
  });

  /************
   * Test to make sure cors will work
   * The main way I know to test this is to make sure OPTION is handled
   * 1. Setup coronado bridge.
   * 2. Make a test call using http OPTION
   * 3. Make sure status is valid
   ************/
  it('Test Cors using option request', async () => {
    // 1. Setup coronado bridge.
    const config = {
      ports: [3000],
      logger,
      outboundProvider: new TestProvider(providerConfig),
    };
    const bridge = new CoronadoBridge(config);
    try {
      // 2. Make a test call using http OPTION
      let res = await testServerOptionsPort(config.ports[0]);

      // 3. Make sure status is valid
      expect(res).to.have.status(204);
    } finally {
      bridge.close();
    }
  });

  function testServerPort(
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

  function testServerOptionsPort(
    port: number,
    { path, body, query }: { path: string; body: any; query?: any } = {
      path: '/',
      body: { name: 'Shane' },
      query: {},
    }
  ): Promise<any> {
    return chai
      .request(`http://localhost:${port}`)
      .options(path)
      .query(query)
      .type('application/json')
      .send(body);
  }
});
