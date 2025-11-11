import { getUniqueId, withTimeout } from '../helpers/utils';
import { TransportError, TransportTimeoutError } from '../types/errors';
import type { Transport, TransportResponse } from '../types/transport';
import { CONTENT_SCRIPT, DEFAULT_REQUEST_TIMEOUT, INPAGE, MULTICHAIN_SUBSTREAM_NAME } from './constants';

/**
 * Creates a transport that communicates with the MetaMask extension via window.postMessage
 * This is primarily used for Firefox where the externally_connectable API is not available
 *
 * @returns A Transport instance that communicates with the MetaMask extension
 *
 * @example
 * ```typescript
 * const transport = getWindowPostMessageTransport();
 * await transport.connect();
 * const result = await transport.request({ method: 'eth_getBalance', params: ['0x123', 'latest'] });
 * ```
 */
export function getWindowPostMessageTransport(params: { defaultTimeout?: number } = {}): Transport {
  const { defaultTimeout = DEFAULT_REQUEST_TIMEOUT } = params;
  let messageListener: ((event: MessageEvent) => void) | null = null;
  const pendingRequests: Map<number, (value: any) => void> = new Map();
  let requestId = getUniqueId();
  /**
   * Storing notification callbacks.
   * If we detect a "notification" (a message without an id) coming from the extension, we'll call each callback in here.
   */
  const notificationCallbacks: Set<(data: unknown) => void> = new Set();

  /**
   * Fire our local notification callbacks
   */
  function notifyCallbacks(data: unknown) {
    for (const cb of notificationCallbacks) {
      try {
        cb(data);
      } catch (err) {
        console.log('[WindowPostMessageTransport] notifyCallbacks error:', err);
      }
    }
  }

  function handleMessage(message: TransportResponse<unknown>): void {
    if (message?.id === null || message?.id === undefined) {
      // No id => notification
      notifyCallbacks(message);
    } else if (pendingRequests.has(message.id)) {
      const resolve = pendingRequests.get(message.id);
      pendingRequests.delete(message.id);

      resolve?.(message);
    }
  }

  function sendRequest(request: any) {
    window.postMessage(
      {
        target: CONTENT_SCRIPT,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: request,
        },
      },
      location.origin,
    );
  }

  async function disconnect() {
    if (messageListener) {
      window.removeEventListener('message', messageListener);
      messageListener = null;
    }
    pendingRequests.clear();
    notificationCallbacks.clear();
  }

  const isConnected = () => Boolean(messageListener);

  return {
    connect: async () => {
      // If we're already connected, reconnect
      if (isConnected()) {
        await disconnect();
      }

      // Set up message listener
      messageListener = (event: MessageEvent) => {
        const { target, data } = event.data;
        if (target !== INPAGE || data?.name !== MULTICHAIN_SUBSTREAM_NAME || event.origin !== location.origin) {
          return;
        }

        handleMessage(data.data);
      };

      window.addEventListener('message', messageListener);
    },
    disconnect,
    isConnected,
    request: <ParamsType extends Object, ReturnType extends Object>(
      params: ParamsType,
      options: { timeout?: number } = {},
    ): Promise<ReturnType> => {
      const { timeout = defaultTimeout } = options;
      if (!isConnected()) {
        throw new TransportError('Transport not connected');
      }

      const id = requestId++;
      const request = {
        jsonrpc: '2.0' as const,
        id,
        ...params,
      };

      return withTimeout<ReturnType>(
        new Promise<ReturnType>((resolve) => {
          // Resolve will actually get a TransportResponse<ReturnType>; we coerce at the end.
          pendingRequests.set(id, (value) => resolve(value as ReturnType));
          sendRequest(request);
        }),
        timeout,
        () => new TransportTimeoutError(),
      ).catch((err) => {
        // Cleanup pending request on timeout (or other rejection before resolution) to prevent leaks
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
        }
        throw err;
      });
    },

    onNotification: (callback: (data: unknown) => void) => {
      notificationCallbacks.add(callback);
      return () => {
        notificationCallbacks.delete(callback);
      };
    },
  };
}
