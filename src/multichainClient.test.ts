import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMockTransport, mockScope, mockSession } from '../tests/mocks';
import { getMultichainClient } from './multichainClient';
import { TransportTimeoutError } from './types/errors';
import type { Transport } from './types/transport';

const mockTransport = getMockTransport();
describe('getMultichainClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client with all required methods', async () => {
    const client = getMultichainClient({ transport: mockTransport });

    expect(client).toBeDefined();
    expect(client.createSession).toBeDefined();
    expect(client.getSession).toBeDefined();
    expect(client.revokeSession).toBeDefined();
    expect(client.invokeMethod).toBeDefined();
  });

  it('should create a session successfully', async () => {
    const client = getMultichainClient({ transport: mockTransport });
    const params = { optionalScopes: mockScope };
    const result = await client.createSession(params);

    expect(result).toEqual(mockSession);
    // First call from initialization
    expect(mockTransport.request).toHaveBeenNthCalledWith(1, { method: 'wallet_getSession' }, { timeout: 1_000 });
    // Second call is the createSession request including options object
    expect(mockTransport.request).toHaveBeenNthCalledWith(
      2,
      {
        method: 'wallet_createSession',
        params,
      },
      { timeout: undefined },
    );
  });

  it('should get session successfully', async () => {
    const client = getMultichainClient({ transport: mockTransport });
    const result = await client.getSession();

    expect(result).toEqual(mockSession);
    // First call from initialization with warmupTimeout
    expect(mockTransport.request).toHaveBeenNthCalledWith(1, { method: 'wallet_getSession' }, { timeout: 1_000 });
    // Second call from explicit getSession()
    expect(mockTransport.request).toHaveBeenNthCalledWith(
      2,
      { method: 'wallet_getSession', params: undefined },
      { timeout: undefined },
    );
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const client = getMultichainClient({ transport: mockTransport });
      await client.revokeSession({});

      expect(mockTransport.request).toHaveBeenNthCalledWith(
        2,
        { method: 'wallet_revokeSession', params: {} },
        { timeout: undefined },
      );
    });

    it('should disconnect transport after revoking session', async () => {
      const client = getMultichainClient({ transport: mockTransport });
      await client.revokeSession({});

      expect(mockTransport.disconnect).toHaveBeenCalled();
    });
  });

  it('should invoke methods successfully', async () => {
    const client = getMultichainClient({ transport: mockTransport });

    // Test signAndSendTransaction
    const signAndSendResult = await client.invokeMethod({
      scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK',
      request: {
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'mock-address' },
          transaction: 'mock-transaction',
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK',
        },
      },
    });
    expect(signAndSendResult).toEqual({ signature: 'mock-signature' });
    expect(mockTransport.request).toHaveBeenNthCalledWith(1, { method: 'wallet_getSession' }, { timeout: 1_000 });
    expect(mockTransport.request).toHaveBeenNthCalledWith(
      2,
      {
        method: 'wallet_invokeMethod',
        params: {
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK',
          request: {
            method: 'signAndSendTransaction',
            params: {
              account: { address: 'mock-address' },
              transaction: 'mock-transaction',
              scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK',
            },
          },
        },
      },
      { timeout: undefined },
    );

    // Test signMessage
    const signMessageResult = await client.invokeMethod({
      scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpK',
      request: {
        method: 'signMessage',
        params: {
          account: { address: 'mock-address' },
          message: 'mock-message',
        },
      },
    });
    expect(signMessageResult).toEqual({
      signature: 'mock-signature',
      signedMessage: 'mock-signed-message',
      signatureType: 'ed25519',
    });
  });

  it('should ensure transport is connected before making requests', async () => {
    const mockConnect = vi.fn(() => Promise.resolve());
    const mockIsConnected = vi.fn(() => false);
    const transport = {
      ...mockTransport,
      connect: mockConnect,
      isConnected: mockIsConnected,
    };

    const client = getMultichainClient({ transport });
    await client.getSession();

    expect(mockIsConnected).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should timeout if transport is too slow', async () => {
    const slowTransport: Transport = {
      ...mockTransport,
      request: vi.fn(() => {
        throw new TransportTimeoutError();
      }) as Transport['request'],
      connect: vi.fn(() => Promise.resolve()),
      isConnected: vi.fn(() => false),
    };
    const client = getMultichainClient({ transport: slowTransport });
    await expect(client.getSession()).rejects.toThrow('Transport request timed out');
  });
});
