/**
 * Interface for transport layer that handles communication with the wallet
 *
 * The transport layer is responsible for:
 * - Establishing and maintaining a connection to the wallet
 * - Sending requests to the wallet
 * - Receiving responses from the wallet
 * - Handling notifications from the wallet
 */
export type Transport = {
  /**
   * Establishes a connection to the wallet
   *
   * @returns A promise that resolves to true if the connection was successful, false otherwise
   */
  connect: () => Promise<void>;

  /**
   * Disconnects from the wallet
   *
   * @returns A promise that resolves when the disconnection is complete
   */
  disconnect: () => Promise<void>;

  /**
   * Checks if the transport is currently connected to the wallet
   *
   * @returns True if connected, false otherwise
   */
  isConnected: () => boolean;

  /**
   * Sends a request to the wallet
   *
   * @template TRequest - The request type containing method and params
   * @template TResponse - The expected response type
   * @param request - Request object with method and optional params
   * @param options - Optional settings for the request
   * @param options.timeout - Maximum time (in ms) before the request fails with a timeout error. Overrides the transport's default timeout if set.
   * @returns A promise that resolves to the response
   */
  request: <TRequest extends TransportRequest, TResponse extends TransportResponse>(
    request: TRequest,
    options?: {
      timeout?: number;
    },
  ) => Promise<TResponse>;

  /**
   * Registers a callback for notifications from the wallet
   *
   * @param callback - Function to call when a notification is received
   * @returns A function to remove the callback
   */
  onNotification: (callback: (data: unknown) => void) => () => void;
};

/**
 * Generic request structure for RPC calls
 */
export type TransportRequest<TMethod = string, TParams = unknown> = {
  method: TMethod;
  params?: TParams;
};

/**
 * Generic response structure for RPC calls
 */
export type TransportResponse<TResult = unknown> = {
  id: number;
  jsonrpc: '2.0';
  result: TResult;
  error?: {
    message: string;
    code: number;
    stack: string;
  };
};
