import { CONTENT_SCRIPT, INPAGE, METAMASK_EXTENSION_CONNECT_CAN_RETRY } from '../transports/constants';
import { METAMASK_PROVIDER_STREAM_NAME } from '../transports/constants';

/**
 * Get the MetaMask extension ID by sending a metamask_getProviderState to the content script
 */
export async function detectMetamaskExtensionId(): Promise<string> {
  return new Promise((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      if (isProviderMessage(event)) {
        const data = event?.data?.data?.data;

        // When a retry message is received, it means the previous getProviderState request was not received by the extension, so we need to retry
        if (data?.method === METAMASK_EXTENSION_CONNECT_CAN_RETRY) {
          getProviderState();
        }
        // Handle the provider state response
        else if (data?.result?.extensionId) {
          const extensionId = data?.result?.extensionId;
          resolve(extensionId);
          window.removeEventListener('message', messageHandler);
          clearTimeout(timeoutId);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('MetaMask extension not found'));
    }, 10000);

    window.addEventListener('message', messageHandler);

    getProviderState();
  });
}

function getProviderState() {
  window.postMessage(
    {
      target: CONTENT_SCRIPT,
      data: { name: METAMASK_PROVIDER_STREAM_NAME, data: { method: 'metamask_getProviderState' } },
    },
    location.origin,
  );
}

function isProviderMessage(event: MessageEvent) {
  const { target, data } = event.data;
  return target === INPAGE && data?.name === METAMASK_PROVIDER_STREAM_NAME && event.origin === location.origin;
}

// EIP-6963 types
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: unknown;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

// Augment WindowEventMap to avoid type casting
declare global {
  interface WindowEventMap {
    'eip6963:announceProvider': EIP6963AnnounceProviderEvent;
    'eip6963:requestProvider': Event;
  }
}

/**
 * Checks if MetaMask is installed by listening for EIP-6963 provider announcements
 * @param timeout - Maximum time to wait for the announcement (in ms)
 * @returns Promise that resolves to true if MetaMask is installed, false otherwise
 */
export async function isMetamaskInstalled({ timeout = 2000 }: { timeout?: number } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const handleEip6963Announcement = (event: EIP6963AnnounceProviderEvent) => {
      if (event.detail.info.rdns === 'io.metamask') {
        window.removeEventListener('eip6963:announceProvider', handleEip6963Announcement);
        clearTimeout(timeoutId);
        resolve(true);
      }
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handleEip6963Announcement);
      resolve(false);
    }, timeout);

    // DApp MUST set up listener BEFORE dispatching request event
    window.addEventListener('eip6963:announceProvider', handleEip6963Announcement);
    // Dispatch request event to trigger announcements from wallets that loaded earlier
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  });
}
