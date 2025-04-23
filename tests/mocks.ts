import { vi } from 'vitest';
import type { MultichainApiMethod, MultichainApiParams, MultichainApiReturn } from '../src/types/multichainApi';
import type { DefaultRpcApi, Scope } from '../src/types/scopes';
import type { ScopeObject, SessionData } from '../src/types/session';
import type { Transport } from '../src/types/transport';

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK' as const;
const MOCK_ACCOUNT = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK:6AwJL1LnMjwsB8GkJCPexEwznnhpiMV4DHv8QsRLtnNc' as const;

export const mockScope: Record<Scope, ScopeObject> = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK': {
    methods: ['getGenesisHash', 'signMessage'],
    notifications: ['accountsChanged'],
  },
};

export const mockSession: SessionData = {
  sessionScopes: {
    [SOLANA_MAINNET]: {
      methods: ['getGenesisHash', 'signMessage'],
      notifications: ['accountsChanged'],
      accounts: [MOCK_ACCOUNT],
    },
  },
  expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
};

export function getMockTransport(): Transport {
  const isConnected = vi.fn(() => true);
  const connect = vi.fn(() => Promise.resolve(true));
  const disconnect = vi.fn(() => Promise.resolve());
  const onNotification = vi.fn(() => () => {});
  const request = vi.fn(
    async <T extends DefaultRpcApi, M extends MultichainApiMethod>({
      method,
      params,
    }: {
      method: M;
      params?: MultichainApiParams<T, M>;
    }): Promise<MultichainApiReturn<T, M>> => {
      switch (method) {
        case 'wallet_createSession':
          return mockSession as MultichainApiReturn<T, M>;
        case 'wallet_getSession':
          return mockSession as MultichainApiReturn<T, M>;
        case 'wallet_revokeSession':
          return (await new Promise((resolve) => resolve())) as MultichainApiReturn<T, M>;
        case 'wallet_invokeMethod': {
          const invokeParams = params as { scope: string; request: { method: string; params: any } };
          const { request } = invokeParams;

          switch (request.method) {
            case 'signAndSendTransaction':
              return { signature: 'mock-signature' } as MultichainApiReturn<T, M>;
            case 'signTransaction':
              return { signedTransaction: 'mock-signed-transaction' } as MultichainApiReturn<T, M>;
            case 'signMessage':
              return {
                signature: 'mock-signature',
                signedMessage: 'mock-signed-message',
                signatureType: 'ed25519',
              } as MultichainApiReturn<T, M>;
            case 'signIn':
              return {
                account: { address: 'mock-address' },
                signedMessage: 'mock-signed-message',
                signature: 'mock-signature',
                signatureType: 'ed25519',
              } as MultichainApiReturn<T, M>;
            default:
              throw new Error(`Unhandled method: ${request.method}`);
          }
        }
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    },
  ) as <T extends DefaultRpcApi, M extends MultichainApiMethod>(params: {
    method: M;
    params?: MultichainApiParams<T, M>;
  }) => Promise<MultichainApiReturn<T, M>>;

  return { isConnected, connect, disconnect, request, onNotification };
}
