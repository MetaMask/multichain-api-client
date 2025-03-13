import type { Json } from '@metamask/utils';
import { registerWallet } from '@wallet-standard/wallet';
import { isChromeRuntime } from './helpers/misc';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import type { CreateSessionParams, MultichainClient, SessionData, Transport } from './types';
import { MetamaskWallet } from './walletStandard';

export { registerWallet };

export async function getMultichainClient({ transport }: { transport: Transport }): Promise<MultichainClient> {
  await ensureConnected();

  async function ensureConnected() {
    console.log('ensureConnected: isConnected', transport.isConnected());

    if (!transport.isConnected()) {
      await transport.connect();
    }
  }

  return {
    createSession: async (params: CreateSessionParams): Promise<SessionData> => {
      await ensureConnected();
      return (await transport.request({
        method: 'wallet_createSession',
        params: params as Json,
      })) as unknown as SessionData;
    },
    getSession: async (): Promise<SessionData | undefined> => {
      await ensureConnected();
      return (await transport.request({
        method: 'wallet_getSession',
      })) as unknown as SessionData | undefined;
    },
    revokeSession: async () => {
      await transport.request({ method: 'wallet_revokeSession' });
      await transport.disconnect();
    },
    invokeMethod: async ({ scope, request }): Promise<Json> => {
      return transport.request({ method: 'wallet_invokeMethod', params: { scope, request } });
    },
  };
}

export function getDefaultTransport(params: { extensionId?: string }): Transport {
  const isChrome = isChromeRuntime();
  return isChrome ? getExternallyConnectableTransport(params) : ({} as Transport); // TODO: Implement stream transport
}

export function getWalletStandard({ client }: { client: MultichainClient }) {
  return new MetamaskWallet({ client });
}

export async function registerSolanaWalletStandard(params: { extensionId?: string }) {
  const client = await getMultichainClient({ transport: getDefaultTransport(params) });

  const wallet = getWalletStandard({ client });

  registerWallet(wallet);
}
