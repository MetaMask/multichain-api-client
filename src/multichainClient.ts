import { withRetry } from './helpers/utils';
import { MultichainApiError } from './types/errors';
import type {
  CreateSessionParams,
  InvokeMethodParams,
  MultichainApiClient,
  MultichainApiMethod,
  MultichainApiParams,
  MultichainApiReturn,
} from './types/multichainApi';
import type { DefaultRpcApi, MethodName, MethodReturn, RpcApi, Scope } from './types/scopes';
import type { SessionData } from './types/session';
import type { Transport, TransportRequest, TransportResponse } from './types/transport';

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
  let initializationPromise: Promise<void> | undefined = undefined;
  let connectionPromise: Promise<void> | undefined = undefined;

  async function ensureConnected() {
    if (transport.isConnected()) {
      return;
    }

    if (!connectionPromise) {
      connectionPromise = transport.connect();
    }
    await connectionPromise;
  }

  async function ensureInitialized() {
    if (initializationPromise) {
      return await initializationPromise;
    }

    initializationPromise = (async () => {
      await ensureConnected();

      // Use withRetry to handle the case where the Multichain API requests don't resolve on page load (cf. https://github.com/MetaMask/metamask-mobile/issues/16550)
      await withRetry(() => transport.request({ method: 'wallet_getSession' }));
    })();

    return await initializationPromise;
  }

  // Try to connect to the transport on client creation to reduce latency when first used
  void ensureConnected();

  return {
    createSession: async (params: CreateSessionParams<T>): Promise<SessionData> => {
      await ensureInitialized();
      return await request({ transport, method: 'wallet_createSession', params });
    },
    getSession: async (): Promise<SessionData | undefined> => {
      await ensureInitialized();
      return await request({ transport, method: 'wallet_getSession' });
    },
    revokeSession: async () => {
      await ensureInitialized();
      initializationPromise = undefined;
      connectionPromise = undefined;
      await request({ transport, method: 'wallet_revokeSession' });
      await transport.disconnect();
    },
    invokeMethod: async <S extends Scope<T>, M extends MethodName<T, S>>(
      params: InvokeMethodParams<T, S, M>,
    ): MethodReturn<T, S, M> => {
      await ensureInitialized();
      return await request({ transport, method: 'wallet_invokeMethod', params });
    },
    extendsRpcApi: <U extends RpcApi>(): MultichainApiClient<T & U> => {
      return getMultichainClient<T & U>({ transport });
    },
    onNotification: (callback: (data: unknown) => void) => {
      return transport.onNotification(callback);
    },
  };
}

async function request<T extends RpcApi, M extends MultichainApiMethod>({
  transport,
  method,
  params,
}: {
  transport: Transport;
  method: M;
  params?: MultichainApiParams<T, M>;
}): Promise<MultichainApiReturn<T, M>> {
  const res = await transport.request<
    TransportRequest<M, MultichainApiParams<T, M>>,
    TransportResponse<MultichainApiReturn<T, M>>
  >({ method, params });

  if (res?.error) {
    throw new MultichainApiError(res.error);
  }

  return res.result;
}
