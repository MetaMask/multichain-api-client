import type { Json } from '@metamask/utils';
import { registerWallet } from '@wallet-standard/wallet';
import { isChromeRuntime } from './helpers/misc';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import type { CreateSessionParams, MultichainClient, SessionData, Transport } from './types';
import { MetamaskWallet } from './walletStandard';

export { registerWallet };

export function getMultichainClient({ transport }: { transport: Transport }): MultichainClient {
  return {
    createSession: async (params: CreateSessionParams): Promise<SessionData> => {
      await transport.connect();
      const session = (await transport.request({
        method: 'wallet_createSession',
        params: params as Json,
      })) as unknown as SessionData;

      return session;
    },
    revokeSession: async () => {
      await transport.request({ method: 'revokeSession' });
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

export function getWalletStandard({ client }: { client: MultichainClient }) {
  return new MetamaskWallet({ client });
}
