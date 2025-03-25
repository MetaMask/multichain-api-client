import { describe, expect, it, mock } from 'bun:test';
import { getMultichainClient } from './multichainClient';
import { getMockTransport, mockScope, mockSession } from './tests/mocks';

const mockTransport = getMockTransport();
describe('getMultichainClient', () => {
  it('should create a client with all required methods', async () => {
    const client = await getMultichainClient({ transport: mockTransport });

    expect(client).toBeDefined();
    expect(client.createSession).toBeDefined();
    expect(client.getSession).toBeDefined();
    expect(client.revokeSession).toBeDefined();
    expect(client.invokeMethod).toBeDefined();
  });

  it('should create a session successfully', async () => {
    const client = await getMultichainClient({ transport: mockTransport });
    const params = { optionalScopes: mockScope };
    const result = await client.createSession(params);

    expect(result).toEqual(mockSession);
    expect(mockTransport.request).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params,
    });
  });

  it('should get session successfully', async () => {
    const client = await getMultichainClient({ transport: mockTransport });
    const result = await client.getSession();

    expect(result).toEqual(mockSession);
    expect(mockTransport.request).toHaveBeenCalledWith({
      method: 'wallet_getSession',
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const client = await getMultichainClient({ transport: mockTransport });
      await client.revokeSession();

      expect(mockTransport.request).toHaveBeenCalledWith({
        method: 'wallet_revokeSession',
      });
    });

    it('should disconnect transport after revoking session', async () => {
      const client = await getMultichainClient({ transport: mockTransport });
      await client.revokeSession();

      expect(mockTransport.disconnect).toHaveBeenCalled();
    });
  });

  it('should invoke methods successfully', async () => {
    const client = await getMultichainClient({ transport: mockTransport });

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
    expect(mockTransport.request).toHaveBeenLastCalledWith({
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
    });

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
    const mockConnect = mock(() => Promise.resolve(true));
    const mockIsConnected = mock(() => false);
    const transport = {
      ...mockTransport,
      connect: mockConnect,
      isConnected: mockIsConnected,
    };

    const client = await getMultichainClient({ transport });
    await client.getSession();

    expect(mockIsConnected).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });
});
