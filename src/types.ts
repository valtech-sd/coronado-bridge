interface IAnyFunction {
  (...args: any[]): any;
}
export interface ILogger {
  debug: IAnyFunction;
  error: IAnyFunction;
  fatal: IAnyFunction;
  info: IAnyFunction;
  trace: IAnyFunction;
}
