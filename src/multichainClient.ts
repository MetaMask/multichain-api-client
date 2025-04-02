import type { CreateSessionParams, InvokeMethodParams, MultichainApiClient } from './types/multichainApi';
import type { DefaultRpcApi, MethodName, MethodReturn, RpcApi, Scope } from './types/scopes';
import type { SessionData } from './types/session';
import type { Transport } from './types/transport';

function createBaseClient<T extends RpcApi>(transport: Transport): MultichainApiClient<T> {
  async function ensureConnected() {
    if (!transport.isConnected()) {
      await transport.connect();
    }
  }

  // @TODO: why do we connect by default here?
  void ensureConnected();

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
      await ensureConnected();
      return await transport.request({ method: 'wallet_invokeMethod', params });
    },
    extendsRpcApi: <U extends RpcApi>(): MultichainApiClient<T & U> => {
      return createBaseClient<T & U>(transport);
    },
    onNotification: (callback: (data: unknown) => void) => {
      return transport.onNotification(callback);
    },
  };
}

export async function getMultichainClient<T extends RpcApi = DefaultRpcApi>({
  transport,
}: { transport: Transport }): Promise<MultichainApiClient<T>> {
  await transport.connect();
  return createBaseClient<T>(transport);
}
