import { isChromeRuntime } from './helpers/utils';
import { getMultichainClient } from './multichainClient';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import { getWindowPostMessageTransport } from './transports/windowPostMessageTransport';
import type { Transport } from './types/transport';

/**
 * Gets the default transport for the current environment (Chrome, Firefox, etc.)
 *
 * @param params - Configuration parameters for the transport
 * @param params.extensionId - Optional MetaMask extension ID for Chrome. If not provided, it will be auto-detected.
 * @returns A Transport instance suitable for the current environment
 *
 * @example
 * ```typescript
 * // Get default transport with auto-detection of extension ID
 * const transport = getDefaultTransport();
 *
 * // Get default transport with specific extension ID
 * const transport = getDefaultTransport({ extensionId: '...' });
 * ```
 */
function getDefaultTransport({
  extensionId,
  defaultTimeout,
}: { extensionId?: string; defaultTimeout?: number } = {}): Transport {
  const isChrome = isChromeRuntime();
  return isChrome
    ? getExternallyConnectableTransport({ extensionId, defaultTimeout })
    : getWindowPostMessageTransport({ defaultTimeout });
}

export { getMultichainClient, getDefaultTransport, getExternallyConnectableTransport, getWindowPostMessageTransport };

export type * from './types/transport';
export type * from './types/session';
export type * from './types/multichainApi';
export * from './types/errors';
