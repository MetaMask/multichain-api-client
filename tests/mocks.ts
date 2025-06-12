import { vi } from 'vitest';
import type { Scope } from '../src/types/scopes';
import type { ScopeObject, SessionData } from '../src/types/session';
import type { Transport, TransportRequest, TransportResponse } from '../src/types/transport';

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
  const connect = vi.fn(() => Promise.resolve());
  const disconnect = vi.fn(() => Promise.resolve());
  const onNotification = vi.fn(() => () => {});

  const request = vi
    .fn()
    .mockImplementation(
      async <TRequest extends TransportRequest, TResponse extends TransportResponse>(
        requestData: TRequest,
      ): Promise<TResponse> => {
        const { method, params } = requestData;

        const response = {
          data: {
            result: (() => {
              switch (method) {
                case 'wallet_createSession':
                  return mockSession;
                case 'wallet_getSession':
                  return mockSession;
                case 'wallet_revokeSession':
                  return undefined;
                case 'wallet_invokeMethod': {
                  const invokeParams = params as { scope: string; request: { method: string; params: any } };
                  const { request } = invokeParams;

                  switch (request.method) {
                    case 'signAndSendTransaction':
                      return { signature: 'mock-signature' };
                    case 'signTransaction':
                      return { signedTransaction: 'mock-signed-transaction' };
                    case 'signMessage':
                      return {
                        signature: 'mock-signature',
                        signedMessage: 'mock-signed-message',
                        signatureType: 'ed25519',
                      };
                    case 'signIn':
                      return {
                        account: { address: 'mock-address' },
                        signedMessage: 'mock-signed-message',
                        signature: 'mock-signature',
                        signatureType: 'ed25519',
                      };
                    default:
                      throw new Error(`Unhandled method: ${request.method}`);
                  }
                }
                default:
                  throw new Error(`Unhandled method: ${method}`);
              }
            })(),
          },
        } as TResponse;

        return response;
      },
    );

  return { isConnected, connect, disconnect, request, onNotification };
}
