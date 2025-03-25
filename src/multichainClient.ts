import type { CreateSessionParams, InvokeMethodParams, MultichainApiClient } from './types/multichainApi';
import type { DefaultRpcApi, MethodName, MethodReturn, RpcApi, Scope } from './types/scopes';
import type { SessionData } from './types/session';
import type { Transport } from './types/transport';

export async function getMultichainClient<T extends RpcApi = DefaultRpcApi>({
  transport,
}: { transport: Transport }): Promise<MultichainApiClient<T>> {
  await ensureConnected();

  async function ensureConnected() {
    if (!transport.isConnected()) {
      await transport.connect();
    }
  }

  return {
    createSession: async (params: CreateSessionParams<T>): Promise<SessionData> => {
      await ensureConnected();
      return await transport.request({
        method: 'wallet_createSession',
        params,
      });
    },
    getSession: async (): Promise<SessionData | undefined> => {
      await ensureConnected();
      return await transport.request({
        method: 'wallet_getSession',
      });
    },
    revokeSession: async () => {
      await transport.request({ method: 'wallet_revokeSession' });
      await transport.disconnect();
    },
    invokeMethod: async <S extends Scope<T>, M extends MethodName<T, S>>(
      params: InvokeMethodParams<T, S, M>,
    ): MethodReturn<T, S, M> => {
      return await transport.request({ method: 'wallet_invokeMethod', params });
    },
  };
}
