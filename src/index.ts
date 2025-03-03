import type { Json } from '@metamask/utils';
import { isChromeRuntime } from './helpers/misc';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import type { CreateSessionParams, MultichainClient, Transport } from './types';

export function getMultichainClient({ transport }: { transport: Transport }): MultichainClient {
  return {
    createSession: async (params: CreateSessionParams) => {
      await transport.connect();
      await transport.request({ method: 'wallet_createSession', params: params as Json });
    },
    revokeSession: async () => {
      await transport.request({ method: 'revokeSession', params: {} });
      await transport.disconnect();
    },
    invokeMethod: async ({ scope, request }): Promise<Json> => {
      return transport.request({ method: 'wallet_invokeMethod', params: { scope, request } });
    },
  };
}

export function getDefaultTransport(): Transport {
  const isChrome = isChromeRuntime();
  return isChrome ? getExternallyConnectableTransport() : ({} as Transport); // TODO: Implement stream transport
}

function getWalletStandard({ client: _client }: { client: MultichainClient }) {
  return {};
}

// TODO: Move to injected script
const client = getMultichainClient({ transport: getDefaultTransport() });

/* const wallet =  */ getWalletStandard({ client });

// register(wallet);
