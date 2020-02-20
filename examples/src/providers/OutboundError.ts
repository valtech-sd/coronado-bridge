import { IOutboundProvider, BridgeError } from 'coronado-bridge';

export default class OutboundError implements IOutboundProvider {
  handler(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const error = true;
      if (error) {
        // Oh no! We have a error
        const bridgeError = new BridgeError(
          537,
          'Flux capacitor not connected!'
        );

        reject(bridgeError);
      }
    });
  }
}
