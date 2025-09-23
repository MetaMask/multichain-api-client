import { detectMetamaskExtensionId } from '../helpers/metamaskExtensionId';
import { withTimeout } from '../helpers/utils';
import { TransportError, TransportTimeoutError } from '../types/errors';
import type { Transport, TransportResponse } from '../types/transport';
import { DEFAULT_REQUEST_TIMEOUT, REQUEST_CAIP } from './constants';

/**
 * Creates a transport that communicates with the MetaMask extension via Chrome's externally_connectable API
 *
 * @param params - Configuration parameters for the transport
 * @param params.extensionId - Optional MetaMask extension ID. If not provided, it will be auto-detected.
 * @returns A Transport instance that communicates with the MetaMask extension
 *
 * @example
 * ```typescript
 * // Create transport with auto-detection of extension ID
 * const transport = getExternallyConnectableTransport();
 *
 * // Create transport with specific extension ID
 * const transport = getExternallyConnectableTransport({
 *   extensionId: '...'
 * });
 * ```
 */
export function getExternallyConnectableTransport(
  params: { extensionId?: string; defaultTimeout?: number } = {},
): Transport {
  let { extensionId } = params;
  const { defaultTimeout = DEFAULT_REQUEST_TIMEOUT } = params;
  let chromePort: chrome.runtime.Port | undefined;
  let requestId = 1;
  const pendingRequests = new Map<number, (value: any) => void>();

  /**
   * Storing notification callbacks.
   * If we detect a "notification" (a message without an id) coming from the extension or fallback, we'll call each callback in here.
   */
  const notificationCallbacks: Set<(data: unknown) => void> = new Set();

  /**
   * Handle messages from the extension
   * @param msg
   */
  function handleMessage(msg: { data: TransportResponse<unknown> }) {
    const { data } = msg;

    // Handle notifications (messages without id)
    if (data?.id === null || data?.id === undefined) {
      notifyCallbacks(data);
    } else if (pendingRequests.has(data.id)) {
      // Handle responses to requests
      const resolve = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);

      resolve?.(data);
    }
  }

  /**
   * Fire our local notification callbacks
   */
  function notifyCallbacks(data: unknown) {
    for (const cb of notificationCallbacks) {
      try {
        cb(data);
      } catch (err) {
        console.log('[ChromeTransport] notifyCallbacks error:', err);
      }
    }
  }

  function removeAllNotificationListeners(): void {
    notificationCallbacks.clear();
  }

  return {
    connect: async () => {
      try {
        if (!extensionId) {
          extensionId = await detectMetamaskExtensionId();
        }

        const pendingPort = chrome.runtime.connect(extensionId);

        let isActive = true;
        pendingPort.onDisconnect.addListener(() => {
          console.log('[ChromeTransport] chromePort disconnected');
          chromePort = undefined;
          isActive = false;
        });

        // let a tick for onDisconnect
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (!isActive) {
          throw new Error(`No extension found with id: ${extensionId}`);
        }

        // Listen to messages from the extension
        pendingPort.onMessage.addListener(handleMessage);

        // Assign the port at the end to avoid race conditions
        chromePort = pendingPort;
      } catch (err) {
        throw new TransportError('Failed to connect to MetaMask', err);
      }
    },
    disconnect: async () => {
      if (chromePort) {
        try {
          chromePort.disconnect();
          chromePort = undefined;
          removeAllNotificationListeners();
          pendingRequests.clear();
        } catch (err) {
          console.log('[ChromeTransport] disconnect error:', err);
        }
      }
    },
    isConnected: () => chromePort !== undefined,
    request: async <ParamsType extends Object, ReturnType extends Object>(
      params: ParamsType,
      options: { timeout?: number } = {},
    ): Promise<ReturnType> => {
      const { timeout = defaultTimeout } = options;
      const currentChromePort = chromePort;
      if (!currentChromePort) {
        throw new TransportError('Chrome port not connected');
      }
      const id = requestId++;
      const requestPayload = {
        id,
        jsonrpc: '2.0',
        ...params,
      };

      try {
        return await withTimeout(
          new Promise((resolve) => {
            pendingRequests.set(id, resolve);
            currentChromePort.postMessage({ type: REQUEST_CAIP, data: requestPayload });
          }),
          timeout,
          () => new TransportTimeoutError(),
        );
      } catch (err) {
        // Ensure we cleanup pendingRequests on timeout (or any error before resolution) to avoid memory leaks
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
        }
        throw err;
      }
    },
    onNotification: (callback: (data: unknown) => void) => {
      notificationCallbacks.add(callback);
      return () => {
        notificationCallbacks.delete(callback);
      };
    },
  };
}
