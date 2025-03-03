import { detectMetaMaskExtensionId } from '../helpers/misc';
import type { Transport } from '../types';

export function getExternallyConnectableTransport(): Transport {
  let chromePort: chrome.runtime.Port | null;
  let extensionId: string | undefined;

  return {
    connect: async () => {
      try {
        extensionId = await detectMetaMaskExtensionId();

        if (!extensionId) {
          console.error('[ExtensionProvider] no extensionId found');
          return false;
        }

        console.debug('[ExtensionProvider] connecting via chrome...');
        chromePort = chrome.runtime.connect(extensionId);

        let isActive = true;
        chromePort.onDisconnect.addListener(() => {
          isActive = false;
          console.error('[ExtensionProvider] chrome runtime disconnected');
          chromePort = null;
        });

        // let a tick for onDisconnect
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (!isActive) {
          return false;
        }

        // Listen to messages from the extension
        chromePort.onMessage.addListener(handleChromeMessage);
        // do a test message if needed
        chromePort.postMessage({ type: 'ping' });

        return true;
      } catch (err) {
        console.error('[ExtensionProvider] connectChrome error:', err);
        return false;
      }
    },
    disconnect: () => {
      return new Promise((resolve) => resolve());
    },
    request: (_data: any) => {
      return new Promise((resolve) => resolve({}));
    },
    onNotification: (_callback: (data: any) => void) => {},
  };
}

/**
 * If we get a message on the chrome port that doesn't have an ID,
 * treat it as a notification or subscription update.
 *
 * @param msg
 */
function handleChromeMessage(msg: any) {
  if (msg?.data?.id) {
    // should be handled in requestViaChrome listener - skipping
  } else {
    // No id => notification
    console.debug('[ExtensionProvider] chrome notification:', msg);
    // notifyCallbacks(msg.data); // TODO: implement
  }
}
