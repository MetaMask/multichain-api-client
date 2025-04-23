import { CONTENT_SCRIPT, INPAGE } from '../transports/constants';
import { METAMASK_PROVIDER_STREAM_NAME } from '../transports/constants';

/**
 * Get the MetaMask extension ID by sending a metamask_getProviderState to the content script
 */
export async function detectMetamaskExtensionId(): Promise<string> {
  return new Promise((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      const { target, data } = event.data;
      if (target === INPAGE && data?.name === METAMASK_PROVIDER_STREAM_NAME) {
        const extensionId = data?.data?.result?.extensionId;
        if (extensionId) {
          resolve(extensionId);
          window.removeEventListener('message', messageHandler);
          clearTimeout(timeoutId);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('MetaMask extension not found'));
    }, 3000);

    window.addEventListener('message', messageHandler);

    window.postMessage(
      {
        target: CONTENT_SCRIPT,
        data: { name: METAMASK_PROVIDER_STREAM_NAME, data: { method: 'metamask_getProviderState' } },
      },
      location.origin,
    );
  });
}
