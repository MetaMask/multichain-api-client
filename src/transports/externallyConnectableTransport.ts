import { detectMetamaskExtensionIdOnInit } from '../helpers/metamaskExtensionId';
import type { MultichainApiMethod, MultichainApiParams, MultichainApiReturn } from '../types/multichainApi';
import type { RpcApi } from '../types/scopes';
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
        if (msg.data.error) {
          reject(new Error(msg.data.error.message));
        } else {
          resolve(msg.data.result);
        }
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
        console.error('[ExtensionProvider] Error in notification callback:', err);
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
          extensionId = await detectMetamaskExtensionIdOnInit();
        }

        if (!extensionId) {
          console.error('[ChromeTransport] MetaMask extension not found');
          return false;
        }

        chromePort = chrome.runtime.connect(extensionId);

        let isActive = true;
        chromePort.onDisconnect.addListener(() => {
          isActive = false;
          console.warn('[ChromeTransport] chrome runtime disconnected');
          chromePort = undefined;
        });

        // let a tick for onDisconnect
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (!isActive) {
          return false;
        }

        // Listen to messages from the extension
        chromePort.onMessage.addListener(handleMessage);

        return true;
      } catch (err) {
        console.error('[ChromeTransport] connectChrome error:', err);
        return false;
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
          console.error('[ChromeTransport] Error disconnecting chrome port:', err);
        }
      }
    },
    isConnected: () => chromePort !== undefined,
    request: <T extends RpcApi, M extends MultichainApiMethod>({
      method,
      params = {},
    }: {
      method: M;
      params?: MultichainApiParams<T, M>;
    }): Promise<MultichainApiReturn<T, M>> => {
      const currentChromePort = chromePort;
      if (!currentChromePort) {
        throw new Error('Chrome port not connected');
      }
      const id = requestId++;
      const requestPayload = {
        id,
        jsonrpc: '2.0',
        method,
        params,
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
