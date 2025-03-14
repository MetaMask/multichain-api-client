import type { Json } from '@metamask/utils';
import type { CreateSessionParams, MultichainClient, SessionData, Transport } from './types';

export async function getMultichainClient({ transport }: { transport: Transport }): Promise<MultichainClient> {
  await ensureConnected();

  async function ensureConnected() {
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
