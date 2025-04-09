import { detectMetamaskExtensionIdOnInit } from '../helpers/metamaskExtensionId';
import type { Transport } from '../types/transport';

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
  let requestId = 0;
  /**
   * Storing notification callbacks.
   * If we detect a "notification" (a message without an id) coming from the extension or fallback, we'll call each callback in here.
   */
  const notificationCallbacks: Set<(data: unknown) => void> = new Set();

  /**
   * If we get a message on the chrome port that doesn't have an ID,
   * treat it as a notification or subscription update.
   *
   * @param msg
   */
  function handleChromeMessage(msg: any) {
    if (msg?.data?.id === null || msg?.data?.id === undefined) {
      // No id => notification
      console.debug('[ChromeTransport] chrome notification:', msg);
      notifyCallbacks(msg.data);
    }
    // otherwise should be handled in requestViaChrome listener - skipping
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

  /* function removeNotificationListener(callback: (data: unknown) => void): void {
    console.debug('[ExtensionProvider] Removing notification listener');
    notificationCallbacks.delete(callback);
  } */

  function removeAllNotificationListeners(): void {
    console.debug('[ExtensionProvider] Removing all notification listeners');
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
        chromePort.onMessage.addListener(handleChromeMessage);

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
        } catch (err) {
          console.error('[ChromeTransport] Error disconnecting chrome port:', err);
        }
      }
    },
    isConnected: () => chromePort !== undefined,
    request: ({ method, params = {} }) => {
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
        const handleMessage = (msg: any) => {
          // Check if the message matches our request ID
          if (msg?.data?.id === id) {
            currentChromePort?.onMessage.removeListener(handleMessage);
            // Check for error or result
            if (msg.data.error) {
              reject(new Error(msg.data.error.message));
            } else {
              resolve(msg.data.result);
            }
          }
        };

        currentChromePort.onMessage.addListener(handleMessage);

        // Send it
        currentChromePort.postMessage({ type: 'caip-x', data: requestPayload });
      });
    },
    onNotification: (callback: (data: unknown) => void) => {
      console.log('[ChromeTransport] Adding notification listener');
      notificationCallbacks.add(callback);
    },
  };
}
