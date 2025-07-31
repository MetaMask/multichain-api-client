import { CONTENT_SCRIPT, INPAGE, METAMASK_EXTENSION_CONNECT_CAN_RETRY } from '../transports/constants';
import { METAMASK_PROVIDER_STREAM_NAME } from '../transports/constants';
import { generateRequestId } from './utils';

/**
 * Get the MetaMask extension ID by sending a metamask_getProviderState to the content script
 */
export async function detectMetamaskExtensionId(): Promise<string> {
  const requestId = generateRequestId();

  return new Promise((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      if (isProviderMessage(event)) {
        const data = event?.data?.data?.data;

        // When a retry message is received, it means the previous getProviderState request was not received by the extension, so we need to retry
        if (data?.method === METAMASK_EXTENSION_CONNECT_CAN_RETRY) {
          getProviderState(requestId);
        }
        // Handle the provider state response
        else if (data?.id === requestId) {
          const extensionId = data?.result?.extensionId;
          if (!extensionId) {
            reject(new Error('metamask_getProviderState response is missing extensionId'));
          }

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

    getProviderState(requestId);
  });
}

function getProviderState(requestId: number) {
  window.postMessage(
    {
      target: CONTENT_SCRIPT,
      data: {
        name: METAMASK_PROVIDER_STREAM_NAME,
        data: { jsonrpc: '2.0', id: requestId, method: 'metamask_getProviderState' },
      },
    },
    location.origin,
  );
}

function isProviderMessage(event: MessageEvent) {
  const { target, data } = event.data;
  return target === INPAGE && data?.name === METAMASK_PROVIDER_STREAM_NAME && event.origin === location.origin;
}
