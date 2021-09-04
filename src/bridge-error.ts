/**
 * This class extends the standard error and adds an HTTP Status Code
 * property. It also implements a constructor that allows all the
 * important properties to be set at once.
 */
class BridgeError extends Error {
  // Extend Error with a status code (a number)
  public status: number;

  /**
   * Construct a new instance of BridgeError
   * @param status - should be an HTTP status code, a number.
   * @param message - any message with helpful info about the error.
   * @param name - a string "error name".
   */
  constructor(status: number, message: string, name?: string) {
    super(message);
    this.status = status;
    this.message = message;
    if (name) this.name = name;
  }
}
// Export
export default BridgeError;
