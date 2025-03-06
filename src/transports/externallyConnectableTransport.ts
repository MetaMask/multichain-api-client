import { isNullOrUndefined } from '@metamask/utils';
import { detectMetamaskExtensionId } from '../helpers/misc';
import type { Transport } from '../types';

export function getExternallyConnectableTransport(): Transport {
  let chromePort: chrome.runtime.Port | null;
  let extensionId: string | undefined;
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
    if (isNullOrUndefined(msg?.data?.id)) {
      // should be handled in requestViaChrome listener - skipping
    } else {
      // No id => notification
      console.debug('[ChromeTransport] chrome notification:', msg);
      notifyCallbacks(msg.data);
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
        extensionId = await detectMetamaskExtensionId();

        if (!extensionId) {
          console.error('[ChromeTransport] MetaMask extension not found');
          return false;
        }

        chromePort = chrome.runtime.connect(extensionId);

        let isActive = true;
        chromePort.onDisconnect.addListener(() => {
          isActive = false;
          console.warn('[ChromeTransport] chrome runtime disconnected');
          chromePort = null;
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
          chromePort = null;
          removeAllNotificationListeners();
        } catch (err) {
          console.error('[ChromeTransport] Error disconnecting chrome port:', err);
        }
      }
    },
    request: ({ method, params }) => {
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
          } else if (!msg?.data?.id) {
            // This is presumably a notification
            console.debug('[ExtensionProvider] notification from chrome:', msg.data);
            notifyCallbacks(msg.data);
          }
        };

        currentChromePort.onMessage.addListener(handleMessage);

        // Send it
        currentChromePort.postMessage({ type: 'caip-x', data: requestPayload });

        // optional timeout
        setTimeout(() => {
          currentChromePort?.onMessage.removeListener(handleMessage);
          reject(new Error('request timeout'));
        }, 30000);
      });
    },
    onNotification: (callback: (data: unknown) => void) => {
      console.log('[ChromeTransport] Adding notification listener');
      notificationCallbacks.add(callback);
    },
  };
}
