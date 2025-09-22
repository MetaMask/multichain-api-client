import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSession } from '../../tests/mocks';
import { TransportError } from '../types/errors';
import { CONTENT_SCRIPT, INPAGE, MULTICHAIN_SUBSTREAM_NAME } from './constants';
import { getWindowPostMessageTransport } from './windowPostMessageTransport';

// Mock window object
const mockWindow = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock location
const mockLocation = {
  origin: 'http://localhost:3000',
};

// @ts-ignore - Mocking window global
global.window = mockWindow as any;
// @ts-ignore - Mocking location global
global.location = mockLocation as any;

describe('WindowPostMessageTransport', () => {
  let transport: ReturnType<typeof getWindowPostMessageTransport>;
  let messageHandler: (event: MessageEvent) => void;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup addEventListener mock to capture the message handler
    mockWindow.addEventListener.mockImplementation((event: string, handler: (event: MessageEvent) => void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    });

    // Create transport instance
    transport = getWindowPostMessageTransport();
  });

  it('should connect successfully', async () => {
    await transport.connect();
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(transport.isConnected()).toBe(true);
  });

  it('should handle requests and responses', async () => {
    await transport.connect();

    // Make a request
    const requestPromise = transport.request({
      method: 'wallet_getSession',
    });

    // Verify postMessage was called with correct data
    expect(mockWindow.postMessage).toHaveBeenCalledWith(
      {
        target: CONTENT_SCRIPT,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            jsonrpc: '2.0',
            id: 1,
            method: 'wallet_getSession',
          },
        },
      },
      mockLocation.origin,
    );

    // Simulate response
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: 1,
            result: mockSession,
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    const response = await requestPromise;
    expect(response).toEqual({
      id: 1,
      result: mockSession,
    });
  });

  it('should handle notifications', async () => {
    await transport.connect();

    // Setup notification callback
    const notificationCallback = vi.fn();
    const unsubscribe = transport.onNotification(notificationCallback);

    // Simulate notification
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: null,
            method: 'accountsChanged',
            params: ['0x123'],
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    expect(notificationCallback).toHaveBeenCalledWith({
      id: null,
      method: 'accountsChanged',
      params: ['0x123'],
    });

    // Test unsubscribe
    unsubscribe();
    notificationCallback.mockClear();

    // Send another notification
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: null,
            method: 'accountsChanged',
            params: ['0x456'],
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    expect(notificationCallback).not.toHaveBeenCalled();
  });

  it('should ignore messages from wrong origin', async () => {
    await transport.connect();

    // Setup notification callback
    const notificationCallback = vi.fn();
    transport.onNotification(notificationCallback);

    // Simulate notification from wrong origin
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: null,
            method: 'accountsChanged',
            params: ['0x123'],
          },
        },
      },
      origin: 'https://malicious-site.com',
    } as MessageEvent);

    expect(notificationCallback).not.toHaveBeenCalled();
  });

  it('should ignore messages with wrong target', async () => {
    await transport.connect();

    // Setup notification callback
    const notificationCallback = vi.fn();
    transport.onNotification(notificationCallback);

    // Simulate notification with wrong target
    messageHandler({
      data: {
        target: 'wrong-target',
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: null,
            method: 'accountsChanged',
            params: ['0x123'],
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    expect(notificationCallback).not.toHaveBeenCalled();
  });

  it('should ignore messages with wrong stream name', async () => {
    await transport.connect();

    // Setup notification callback
    const notificationCallback = vi.fn();
    transport.onNotification(notificationCallback);

    // Simulate notification with wrong stream name
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: 'wrong-stream',
          data: {
            id: null,
            method: 'accountsChanged',
            params: ['0x123'],
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    expect(notificationCallback).not.toHaveBeenCalled();
  });

  it('should handle disconnection', async () => {
    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(transport.isConnected()).toBe(false);
  });

  it('should throw error when making request while disconnected', async () => {
    expect(() => transport.request({ method: 'wallet_getSession' })).toThrow(
      new TransportError('Transport not connected'),
    );
  });

  it('should handle multiple requests with different IDs', async () => {
    await transport.connect();

    // Make two requests
    const request1Promise = transport.request({
      method: 'wallet_getSession',
    });

    const request2Promise = transport.request({
      method: 'wallet_createSession',
      params: { optionalScopes: {} },
    });

    // Verify both postMessages were called
    expect(mockWindow.postMessage).toHaveBeenCalledTimes(2);

    // Simulate responses in reverse order
    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: 2,
            result: { success: true },
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    messageHandler({
      data: {
        target: INPAGE,
        data: {
          name: MULTICHAIN_SUBSTREAM_NAME,
          data: {
            id: 1,
            result: mockSession,
          },
        },
      },
      origin: mockLocation.origin,
    } as MessageEvent);

    const [response1, response2] = await Promise.all([request1Promise, request2Promise]);
    expect(response1).toEqual({
      id: 1,
      result: mockSession,
    });
    expect(response2).toEqual({
      id: 2,
      result: { success: true },
    });
  });

  it('should handle reconnection', async () => {
    // First connection
    await transport.connect();
    expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1);

    // Second connection should disconnect first
    await transport.connect();
    expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(1);
    expect(mockWindow.addEventListener).toHaveBeenCalledTimes(2);
    expect(transport.isConnected()).toBe(true);
  });

  it('should timeout if no response is received', async () => {
    await transport.connect();
    // Do not simulate a response: it should timeout
    await expect(transport.request({ method: 'wallet_getSession' }, { timeout: 10 })).rejects.toThrow(
      'Transport request timed out',
    );
    await expect(transport.request({ method: 'wallet_getSession' }, { timeout: 10 })).rejects.toThrow(TransportError);
  });
});
