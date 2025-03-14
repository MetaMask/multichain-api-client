import type { RpcMethod } from '../rpc';

export type Commitment = 'processed' | 'confirmed' | 'finalized';

export type SolanaRpc = {
  methods: {
    signAndSendTransaction: RpcMethod<
      {
        account: { address: string };
        transaction: string;
        scope: string;
        options?: {
          commitment?: Commitment;
          skipPreflight?: string;
          maxRetries?: number;
        };
      },
      { signature: string }
    >;

    signTransaction: RpcMethod<
      {
        account: { address: string };
        transaction: string;
        scope: string;
        options?: {
          preflightCommitment?: Commitment;
          minContextSlot?: number;
        };
      },
      { signedTransaction: string }
    >;

    signMessage: RpcMethod<
      {
        account: { address: string };
        message: string;
      },
      {
        signature: string;
        signedMessage: string;
        signatureType?: string;
      }
    >;

    signIn: RpcMethod<
      {
        domain?: string;
        address?: string;
        statement?: string;
        uri?: string;
        version?: string;
        chainId?: string;
        nonce?: string;
        issuedAt?: string;
        expirationTime?: string;
        notBefore?: string;
        requestId?: string;
        resources?: string[];
      },
      {
        account: { address: string };
        signedMessage: string;
        signature: string;
        signatureType?: 'ed25519';
      }
    >;
  };
  events: [];
};
