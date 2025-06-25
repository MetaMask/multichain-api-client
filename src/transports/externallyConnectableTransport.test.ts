import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockPort, mockSession } from '../../tests/mocks';
import * as metamaskExtensionId from '../helpers/metamaskExtensionId';
import { TransportError } from '../types/errors';
import { getExternallyConnectableTransport } from './externallyConnectableTransport';

const testExtensionId = 'metamask-extension-id';

// Mock chrome.runtime
const mockChrome = {
  runtime: {
    connect: vi.fn(),
  },
};

// @ts-ignore - Mocking chrome global
global.chrome = mockChrome;

describe('ExternallyConnectableTransport E2E', () => {
  let transport: ReturnType<typeof getExternallyConnectableTransport>;
  let messageHandler: (msg: any) => void;
  let disconnectHandler: () => void;

  let mockPort: MockPort;
  beforeEach(() => {
    vi.clearAllMocks();

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
    // Mock detectMetamaskExtensionId to return testExtensionId
    const detectSpy = vi.spyOn(metamaskExtensionId, 'detectMetamaskExtensionId').mockResolvedValue(testExtensionId);

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
        id: 1,
        jsonrpc: '2.0',
        result: mockSession,
      },
    });

    const response = await requestPromise;
    expect(response.result).toEqual(mockSession);
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'caip-348',
      data: {
        id: 1,
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
    expect(() => transport.request({ method: 'wallet_getSession' })).toThrow(
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
});
