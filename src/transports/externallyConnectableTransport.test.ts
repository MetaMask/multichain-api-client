import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockPort, mockSession } from '../../tests/mocks';
import * as metamaskHelper from '../helpers/metamask';
import * as utils from '../helpers/utils';
import { TransportError } from '../types/errors';
import { getExternallyConnectableTransport } from './externallyConnectableTransport';

const testExtensionId = 'metamask-extension-id';

const mockChrome = {
  runtime: {
    connect: vi.fn(),
  },
};

// @ts-ignore - Mocking chrome global
global.chrome = mockChrome;

describe('ExternallyConnectableTransport', () => {
  let transport: ReturnType<typeof getExternallyConnectableTransport>;
  let messageHandler: (msg: any) => void;
  let disconnectHandler: () => void;
  const MOCK_INITIAL_REQUEST_ID = 1000;

  let mockPort: MockPort;
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getUniqueId() to return sequential values starting from MOCK_INITIAL_REQUEST_ID
    let requestIdCounter = MOCK_INITIAL_REQUEST_ID;
    vi.spyOn(utils, 'getUniqueId').mockImplementation(() => {
      return requestIdCounter++;
    });

    // Setup mock port
    mockPort = {
      postMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn((handler: (msg: any) => void) => {
          messageHandler = handler;
        }),
      },
      onDisconnect: {
        addListener: vi.fn((handler: () => void) => {
          disconnectHandler = handler;
        }),
      },
      disconnect: vi.fn(),
    };

    // Setup chrome.runtime.connect mock
    mockChrome.runtime.connect.mockReturnValue(mockPort);

    // Create transport instance
    transport = getExternallyConnectableTransport({ extensionId: testExtensionId });
  });

  afterEach(async () => {
    await transport.disconnect();
  });

  it('should fetch extension id when not provided', async () => {
    const detectSpy = vi.spyOn(metamaskHelper, 'detectMetamaskExtensionId').mockResolvedValue(testExtensionId);

    const newTransport = getExternallyConnectableTransport({});
    await newTransport.connect();

    expect(detectSpy).toHaveBeenCalled();
    expect(mockChrome.runtime.connect).toHaveBeenCalledWith(testExtensionId);

    detectSpy.mockRestore();
  });

  it('should connect successfully', async () => {
    await transport.connect();
    expect(mockChrome.runtime.connect).toHaveBeenCalledWith(testExtensionId);
    expect(mockPort.onMessage.addListener).toHaveBeenCalled();
    expect(mockPort.onDisconnect.addListener).toHaveBeenCalled();
  });

  it('should handle requests and responses', async () => {
    await transport.connect();
    const requestPromise = transport.request({
      method: 'wallet_getSession',
    });

    // Simulate response
    messageHandler({
      type: 'caip-348',
      data: {
        id: MOCK_INITIAL_REQUEST_ID,
        jsonrpc: '2.0',
        result: mockSession,
      },
    });

    const response = await requestPromise;
    expect(response.result).toEqual(mockSession);
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'caip-348',
      data: {
        id: MOCK_INITIAL_REQUEST_ID,
        jsonrpc: '2.0',
        method: 'wallet_getSession',
      },
    });
  });

  it('should handle notifications', async () => {
    await transport.connect();

    const notificationCallback = vi.fn();
    transport.onNotification(notificationCallback);
    messageHandler!({
      data: {
        id: null,
        method: 'accountsChanged',
        params: ['0x123'],
      },
    });

    expect(notificationCallback).toHaveBeenCalledWith({
      id: null,
      method: 'accountsChanged',
      params: ['0x123'],
    });
  });

  it('should handle disconnection', async () => {
    await transport.connect();
    disconnectHandler();

    expect(transport.isConnected()).toBe(false);
  });

  it('should throw error when making request while disconnected', async () => {
    await expect(() => transport.request({ method: 'wallet_getSession' })).rejects.toThrow(
      new TransportError('Chrome port not connected'),
    );
  });

  it('should handle connection errors', async () => {
    mockChrome.runtime.connect.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const error = await transport.connect().catch((e) => e);
    expect(error).toBeInstanceOf(TransportError);
    expect(error.message).toBe('Failed to connect to MetaMask');
  });

  it('should timeout if no response is received', async () => {
    await transport.connect();
    // On ne simule pas de réponse, la promesse doit timeout
    await expect(transport.request({ method: 'wallet_getSession' }, { timeout: 10 })).rejects.toThrow(
      'Transport request timed out',
    );
    await expect(transport.request({ method: 'wallet_getSession' }, { timeout: 10 })).rejects.toThrow(TransportError);
  });

  it('should cleanup pending request after timeout allowing subsequent requests', async () => {
    await transport.connect();
    await expect(transport.request({ method: 'wallet_getSession' }, { timeout: 10 })).rejects.toThrow(
      'Transport request timed out',
    );

    // Second request should work (id MOCK_INITIAL_REQUEST_ID + 1)
    const secondPromise = transport.request({ method: 'wallet_getSession' });

    messageHandler({
      type: 'caip-348',
      data: {
        id: MOCK_INITIAL_REQUEST_ID + 1,
        jsonrpc: '2.0',
        result: mockSession,
      },
    });

    const response = await secondPromise;
    expect(response).toEqual({ id: MOCK_INITIAL_REQUEST_ID + 1, jsonrpc: '2.0', result: mockSession });
  });

  it('should expose warmupTimeout when provided', () => {
    const transportWithWarmup = getExternallyConnectableTransport({
      extensionId: testExtensionId,
      warmupTimeout: 500,
    });
    expect(transportWithWarmup.warmupTimeout).toBe(500);
  });

  it('should have default warmupTimeout of 200ms when not provided', () => {
    expect(transport.warmupTimeout).toBe(200);
  });

  it('should support -1 as warmupTimeout to disable timeout', () => {
    const transportWithNoTimeout = getExternallyConnectableTransport({
      extensionId: testExtensionId,
      warmupTimeout: -1,
    });
    expect(transportWithNoTimeout.warmupTimeout).toBe(-1);
  });
});
