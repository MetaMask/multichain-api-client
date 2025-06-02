import { detectMetamaskExtensionId } from '../helpers/metamaskExtensionId';
import { TransportError } from '../types/errors';
import type { Transport } from '../types/transport';
import { REQUEST_CAIP } from './constants';

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
export function getExternallyConnectableTransport(params: { extensionId?: string } = {}): Transport {
  let { extensionId } = params;
  let chromePort: chrome.runtime.Port | undefined;
  let requestId = 1;
  const requestMap: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map();

  /**
   * Storing notification callbacks.
   * If we detect a "notification" (a message without an id) coming from the extension or fallback, we'll call each callback in here.
   */
  const notificationCallbacks: Set<(data: unknown) => void> = new Set();

  /**
   * Handle messages from the extension
   * @param msg
   */
  function handleMessage(msg: any) {
    // Handle notifications (messages without id)
    if (msg?.data?.id === null || msg?.data?.id === undefined) {
      notifyCallbacks(msg.data);
    } else if (requestMap.has(msg.data.id)) {
      // Handle responses to requests
      const { resolve, reject } = requestMap.get(msg.data.id) ?? {};
      requestMap.delete(msg.data.id);

      if (resolve && reject) {
        resolve(msg);
      }
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
          requestMap.clear();
        } catch (err) {
          console.log('[ChromeTransport] disconnect error:', err);
        }
      }
    },
    isConnected: () => chromePort !== undefined,
    request: <ParamsType extends Object, ReturnType extends Object>(params: ParamsType): Promise<ReturnType> => {
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

      return new Promise((resolve, reject) => {
        requestMap.set(id, { resolve, reject });
        currentChromePort.postMessage({ type: REQUEST_CAIP, data: requestPayload });
      });
    },
    onNotification: (callback: (data: unknown) => void) => {
      notificationCallbacks.add(callback);
      return () => {
        notificationCallbacks.delete(callback);
      };
    },
  };
}
