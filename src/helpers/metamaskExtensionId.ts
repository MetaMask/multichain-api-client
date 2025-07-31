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
