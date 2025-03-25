import type { MetaMaskInpageProvider } from '@metamask/providers';

/**
 * Detects the MetaMask extension ID on initialization
 *
 * WARNING:
 * - this function only works on the first page load, so most likely from an injected script.
 * - if you need to detect the extension ID after page load, use `detectMetamaskExtensionId` instead.
 */
export async function detectMetamaskExtensionIdOnInit(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const messageHandler = ({ data }: { data: any }) => {
      const extensionId = data?.data?.data?.result?.extensionId;
      if (data?.data?.name === 'metamask-provider' && extensionId) {
        window.removeEventListener('message', messageHandler);
        // eslint-disable-next-line no-use-before-define
        clearTimeout(timeoutId); // Clear the timeout when we succeed
        resolve(extensionId);
      }
    };

    window.addEventListener('message', messageHandler);

    // Store timeout ID so we can clear it
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve(undefined);
    }, 3000);
  });
}

/**
 * Automatically detects MetaMask extension ID if available
 */
export async function detectMetamaskExtensionId(provider: MetaMaskInpageProvider): Promise<string | undefined> {
  const providerState = (await provider.request({ method: 'metamask_getProviderState' })) as { extensionId?: string };
  return providerState?.extensionId;
}
