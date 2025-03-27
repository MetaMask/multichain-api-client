import { isChromeRuntime } from './helpers/utils';
import { getMultichainClient } from './multichainClient';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import type { Transport } from './types/transport';

function getDefaultTransport(params: { extensionId?: string } = {}): Transport {
  const isChrome = isChromeRuntime();
  return isChrome ? getExternallyConnectableTransport(params) : ({} as Transport); // TODO: Implement stream transport
}

export { getMultichainClient, getDefaultTransport };

export type * from './types/transport';
export type * from './types/session';
export type * from './types/multichainApi';
