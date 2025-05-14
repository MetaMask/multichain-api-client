import type { CreateSessionParams, InvokeMethodParams, MultichainApiClient } from './types/multichainApi';
import type { DefaultRpcApi, MethodName, MethodReturn, RpcApi, Scope } from './types/scopes';
import type { SessionData } from './types/session';
import type { Transport } from './types/transport';

/**
 * Creates a Multichain API client with the specified transport
 *
 * @param options - Configuration options for the client
 * @param options.transport - The transport layer to use for communication with the wallet
 * @returns A promise that resolves to a MultichainApiClient instance
 *
 * @example
 * ```typescript
 * const client = getMultichainClient({
 *   transport: getDefaultTransport()
 * });
 *
 * // Create a session with optional scopes
 * const session = await client.createSession({
 *   optionalScopes: { 'eip155:1': { methods: ['eth_sendTransaction'] } }
 * });
 *
 * // Invoke a method
 * const result = await client.invokeMethod({
 *   scope: 'eip155:1',
 *   request: {
 *     method: 'eth_sendTransaction',
 *     params: { to: '0x1234...', value: '0x0' }
 *   }
 * });
 * ```
 */
export function getMultichainClient<T extends RpcApi = DefaultRpcApi>({
  transport,
}: { transport: Transport }): MultichainApiClient<T> {
  async function ensureConnected() {
    if (!transport.isConnected()) {
      await transport.connect();
    }
  }

  // Try to connect to the transport on client creation to reduce latency when first used
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
      try {
        await transport.request({ method: 'wallet_revokeSession' });
      } finally {
        await transport.disconnect();
      }
    },
    invokeMethod: async <S extends Scope<T>, M extends MethodName<T, S>>(
      params: InvokeMethodParams<T, S, M>,
    ): MethodReturn<T, S, M> => {
      await ensureConnected();
      return await transport.request({ method: 'wallet_invokeMethod', params });
    },
    extendsRpcApi: <U extends RpcApi>(): MultichainApiClient<T & U> => {
      return getMultichainClient<T & U>({ transport });
    },
    onNotification: (callback: (data: unknown) => void) => {
      return transport.onNotification(callback);
    },
  };
}
