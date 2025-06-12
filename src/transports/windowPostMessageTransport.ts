import { TransportError } from '../types/errors';
import type { Transport } from '../types/transport';
import { CONTENT_SCRIPT, INPAGE, MULTICHAIN_SUBSTREAM_NAME } from './constants';

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
export function getWindowPostMessageTransport(): Transport {
  let messageListener: ((event: MessageEvent) => void) | null = null;
  const requestMap: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }> = new Map();
  let requestId = 1;
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

  function handleMessage(message: any): void {
    if (message?.id === null || message?.id === undefined) {
      // No id => notification
      notifyCallbacks(message);
    } else if (requestMap.has(message.id)) {
      const { resolve } = requestMap.get(message.id) ?? {};
      requestMap.delete(message.id);

      if (resolve) {
        resolve(message);
      }
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
    requestMap.clear();
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
    request: <ParamsType extends Object, ReturnType extends Object>(params: ParamsType): Promise<ReturnType> => {
      if (!isConnected()) {
        throw new TransportError('Transport not connected');
      }

      const id = requestId++;
      const request = {
        jsonrpc: '2.0' as const,
        id,
        ...params,
      };

      return new Promise((resolve, reject) => {
        requestMap.set(id, { resolve, reject });
        sendRequest(request);
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
