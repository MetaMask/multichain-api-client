import type { SignedTransaction, Transaction } from 'tronweb/lib/esm/types/Transaction';
import type { RpcMethod } from '.';

export type TronRpc = {
  methods: {
    signMessage: RpcMethod<
      {
        message: string;
        privateKey?: string;
      },
      { signature: string }
    >;
    signTransaction: RpcMethod<
      {
        transaction: Transaction;
        privateKey?: string;
      },
      { signedTransaction: SignedTransaction }
    >;
  };
  events: [];
};
