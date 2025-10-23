import type { RpcMethod } from '.';

export type Commitment = 'processed' | 'confirmed' | 'finalized';

type Utxo = {
  // Outpoint of the utxo in the format <txid>:<vout>
  outpoint: string;
  // Value of output in satoshis
  value: string;
  derivationIndex: number;
  // scriptPubley in ASM format
  scriptPubkey: string;
  scriptPubkeyHex: string;
  // If the script can be represented as an address, omitted otherwise
  address?: string;
};

export type BitcoinRpc = {
  methods: {
    signMessage: RpcMethod<
      {
        account: { address: string };
        message: string;
      },
      { signature: string }
    >;
    sendTransfer: RpcMethod<
      {
        account: { address: string };
        recipients: { address: string; amount: string }[];
        feeRate?: number;
      },
      { txid: string }
    >;
    signPsbt: RpcMethod<
      {
        account: { address: string };
        options: {
          fill: boolean;
          broadcast: boolean;
        };
        psbt: string;
        feeRate?: number | undefined;
      },
      { psbt: string; txid: string | null }
    >;
    fillPsbt: RpcMethod<{ account: { address: string }; psbt: string }, { psbt: string }>;
    broadcastPsbt: RpcMethod<{ account: { address: string }; psbt: string }, { txid: string }>;
    computeFee: RpcMethod<{ account: { address: string }; psbt: string }, { fee: string }>;
    getUtxo: RpcMethod<{ account: { address: string }; outpoint: string }, Utxo>;
  };
};
