/**
 * Detects if we're in a Chrome-like environment with extension support
 */
export const isChromeRuntime = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.connect === 'function';
};

/**
 * Automatically detects MetaMask extension ID if available
 */
export function detectMetamaskExtensionId(): Promise<string | undefined> {
  console.log('detectMetamaskExtensionId');

  return new Promise((resolve) => {
    const messageHandler = ({ data }: { data: any }) => {
      const extensionId = data?.data?.data?.result?.extensionId;
      if (data?.data?.name === 'metamask-provider' && extensionId) {
        window.removeEventListener('message', messageHandler);
        // eslint-disable-next-line no-use-before-define
        clearTimeout(timeoutId); // Clear the timeout when we succeed
        console.log('found extensionId', extensionId);

        resolve(extensionId);
      }
    };

    window.addEventListener('message', messageHandler);

    // Store timeout ID so we can clear it
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      console.log('No provider state found after 3 seconds');
      resolve(undefined);
    }, 3000);
  });
}
