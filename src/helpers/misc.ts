import { discoverWallets, walletFilters } from './walletDiscovery';

/**
 * Detects if we're in a Chrome-like environment with extension support
 */
export const isChromeRuntime = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.connect === 'function';
};

/**
 * Automatically detects MetaMask extension ID if available
 */
export const detectMetamaskExtensionId = async (): Promise<string | undefined> => {
  try {
    const wallets = await discoverWallets({
      timeout: 1000,
      filterPredicate: walletFilters.isMetamask,
    });

    return wallets[0]?.providerId;
  } catch (error) {
    console.error('Failed to detect MetaMask extension:', error);
    return undefined;
  }
};
