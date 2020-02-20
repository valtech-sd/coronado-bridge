export interface IOutboundProvider {
  handler(message: object): Promise<void>;
}
