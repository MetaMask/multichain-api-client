/**
 * Detects if we're in a Chrome-like environment with extension support
 */
export const isChromeRuntime = (): boolean => {
  return typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.connect === 'function';
};
