import { expectError, expectType } from 'tsd';
import { getMultichainClient } from '../src/index';
import { getMockTransport } from './mocks';

const client = await getMultichainClient({ transport: getMockTransport() });

// ==========================================
// Test successful method calls
// ==========================================

// Basic signMessage call with correct scope and parameters
expectType<{
  signature: string;
  signedMessage: string;
  signatureType?: string;
}>(
  await client.invokeMethod({
    scope: 'solana:1',
    request: {
      method: 'signMessage',
      params: {
        account: {
          address: '1234567890',
        },
        message: 'message',
      },
    },
  }),
);

// Basic eth_call with correct scope and parameters
expectType<string>(
  await client.invokeMethod({
    scope: 'eip155:1',
    request: {
      method: 'eth_call',
      params: {
        to: '0x1234567890',
        data: '0x1234567890',
      },
    },
  }),
);

// ==========================================
// Test error cases for invalid inputs
// ==========================================

// Invalid scope format (missing version)
expectError(
  await client.invokeMethod({
    scope: 'solana',
    request: {
      method: 'signMessage',
      params: {
        account: {
          address: '1234567890',
        },
        message: 'message',
      },
    },
  }),
);

// Invalid scope name
expectError(
  await client.invokeMethod({
    scope: 'fakeScope:1',
    request: {
      method: 'signMessage',
      params: {
        account: {
          address: '1234567890',
        },
        message: 'message',
      },
    },
  }),
);

// Invalid method name
expectError(
  await client.invokeMethod({
    scope: 'solana:1',
    request: {
      method: 'fakeMethod',
      params: {
        account: {
          address: '1234567890',
        },
        message: 'message',
      },
    },
  }),
);

// Invalid parameter structure
expectError(
  await client.invokeMethod({
    scope: 'solana:1',
    request: {
      method: 'signMessage',
      params: {
        address: '1234567890',
        message: 'message',
      },
    },
  }),
);

// ==========================================
// Test extended RPC API
// ==========================================

// Extend transport with custom methods
const extendedClient = client.extendsRpcApi<{
  fakeScope: {
    methods: {
      fakeMethod: (params: { message: string }) => Promise<string>;
    };
  };
  solana: {
    methods: {
      signAllTransactions: (params: { transactions: string[] }) => Promise<string[]>;
    };
  };
}>();

// Test method on added scope
expectType<string>(
  await extendedClient.invokeMethod({
    scope: 'fakeScope:1',
    request: {
      method: 'fakeMethod',
      params: {
        message: 'message',
      },
    },
  }),
);

// Test existing method on existing scope
expectType<{
  signature: string;
  signedMessage: string;
  signatureType?: string;
}>(
  await extendedClient.invokeMethod({
    scope: 'solana:1',
    request: {
      method: 'signMessage',
      params: {
        account: {
          address: '1234567890',
        },
        message: 'message',
      },
    },
  }),
);

// Test added method on existing scope
expectType<string[]>(
  await extendedClient.invokeMethod({
    scope: 'solana:1',
    request: {
      method: 'signAllTransactions',
      params: {
        transactions: ['transaction1', 'transaction2'],
      },
    },
  }),
);
