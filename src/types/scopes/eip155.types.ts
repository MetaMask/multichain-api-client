import type { RpcMethod } from '../rpc';

export type Eip155Rpc = {
  methods: {
    eth_sendTransaction: RpcMethod<{ to: string; value?: string; data?: string }, string>;
    eth_call: RpcMethod<{ to: string; data?: string }, string>;
    eth_getBalance: RpcMethod<{ address: string; blockNumber: string }, string>;
  };
  events: ['eth_subscription'];
};
