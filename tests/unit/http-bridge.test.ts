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
  constructor(config: ITestConfig) {
    expect(config.testProp).to.exist;
  }

  handler(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      expect(message).to.exist;
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

describe('HTTP Bridge', function() {
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
    testServerPort(3000).then(res => {
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
      .then(res => {
        expect(res).to.have.status(200);
        firstSeverCallWasSuccessful = true;
      })
      .then(() => {
        bridge.close();
        return testServerPort(3000);
      })
      .then(res => {
        expect(res).to.not.exist;
      })
      .catch(err => {
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

    config.ports.forEach(port => {
      testPromises.push(
        testServerPort(port).then(res => {
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

    config.ports.forEach(port => {
      testPromises.push(
        testServerPort(port).then(res => {
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

  function testServerPort(port: number) {
    return chai
      .request(`http://localhost:${port}`)
      .post('/')
      .type('application/json')
      .send({
        name: 'Shane',
      });
  }
});
