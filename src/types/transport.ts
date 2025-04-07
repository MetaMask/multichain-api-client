import type { MultichainApiMethod, MultichainApiParams, MultichainApiReturn } from './multichainApi';
import type { RpcApi } from './scopes';

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
  connect: () => Promise<boolean>;

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
   * @param params - Request parameters
   * @param params.method - The method to call
   * @param params.params - The parameters for the method
   * @returns A promise that resolves to the method return value
   */
  request: <T extends RpcApi, M extends MultichainApiMethod>(params: {
    method: M;
    params?: MultichainApiParams<T, M>;
  }) => Promise<MultichainApiReturn<T, M>>;

  /**
   * Registers a callback for notifications from the wallet
   *
   * @param callback - Function to call when a notification is received
   */
  onNotification: (callback: (data: unknown) => void) => void;
};
