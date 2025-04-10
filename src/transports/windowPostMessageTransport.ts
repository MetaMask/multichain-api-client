import type { MultichainApiMethod, MultichainApiParams, MultichainApiReturn } from '../types/multichainApi';
import type { RpcApi } from '../types/scopes';
import type { Transport } from '../types/transport';

const CONTENT_SCRIPT = 'metamask-contentscript';
const INPAGE = 'metamask-inpage';
const MULTICHAIN_SUBSTREAM_NAME = 'metamask-multichain-provider';

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
        console.error('[WindowPostMessageTransport] Error in notification callback:', err);
      }
    }
  }

  function handleMessage(message: any): void {
    if (message.id && requestMap.has(message.id)) {
      const { resolve, reject } = requestMap.get(message.id) ?? {};
      requestMap.delete(message.id);

      if (resolve && reject) {
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      }
    } else if (!message.id) {
      // It's a notification
      notifyCallbacks(message);
    }
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
      if (isConnected()) {
        await disconnect();
      }

      // Set up message listener
      messageListener = (event: MessageEvent) => {
        const { target, data } = event.data;
        if (target !== INPAGE || data?.name !== MULTICHAIN_SUBSTREAM_NAME) {
          return;
        }

        handleMessage(data.data.data);
      };

      window.addEventListener('message', messageListener);

      return true;
    },

    disconnect,
    isConnected,
    request: <T extends RpcApi, M extends MultichainApiMethod>({
      method,
      params = {},
    }: {
      method: M;
      params?: MultichainApiParams<T, M>;
    }): Promise<MultichainApiReturn<T, M>> => {
      if (!isConnected()) {
        throw new Error('Not connected to any extension. Call connect() first.');
      }

      const id = requestId++;
      const request = {
        jsonrpc: '2.0' as const,
        id,
        method,
        params,
      };

      return new Promise((resolve, reject) => {
        requestMap.set(id, { resolve, reject });
        _sendRequest(request);
      });
    },

    onNotification: (callback: (data: unknown) => void) => {
      notificationCallbacks.add(callback);
    },
  };
}

function _sendRequest(request: any) {
  window.postMessage(
    {
      target: CONTENT_SCRIPT,
      data: {
        name: MULTICHAIN_SUBSTREAM_NAME,
        data: {
          type: 'caip-x',
          data: request,
        },
      },
    },
    location.origin,
  );
}
