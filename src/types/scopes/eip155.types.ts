import type { RpcMethod } from '.';

// Base types
export type HexString = `0x${string}`;
export type Address = `0x${string}`;
export type Hash32 = `0x${string}`;
export type BlockTag = 'earliest' | 'finalized' | 'safe' | 'latest' | 'pending';
export type BlockNumberOrTag = HexString | BlockTag;
export type BlockNumberOrTagOrHash = HexString | BlockTag | Hash32;

// Complex types for method parameters and responses
export interface AddEthereumChainParameter {
  chainId: HexString;
  chainName: string;
  nativeCurrency: {
    name?: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
}

export interface TypedData {
  types: {
    EIP712Domain: Array<{
      name: string;
      type: string;
    }>;
    [key: string]: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  domain: Record<string, any>;
  message: Record<string, any>;
}

export interface WatchAssetOptions {
  address: string;
  symbol?: string;
  decimals?: number;
  image?: string;
  tokenId?: string;
}

export interface Call {
  to?: Address;
  data?: HexString;
  value?: HexString;
  capabilities?: Record<string, any>;
}

export interface SendCallsParameter {
  version: string;
  id?: string;
  from: Address;
  chainId: HexString;
  atomicRequired: boolean;
  calls: Call[];
  capabilities?: Record<string, any>;
}

export interface BatchResult {
  id: string;
  capabilities?: Record<string, any>;
}

export interface BatchStatus {
  version: string;
  id: string;
  chainId: HexString;
  status: number;
  atomic: boolean;
  receipts?: Array<{
    logs: Array<{
      address: Address;
      data: HexString;
      topics: HexString[];
    }>;
    status: HexString;
    blockHash: Hash32;
    blockNumber: HexString;
    gasUsed: HexString;
    transactionHash: Hash32;
    [key: string]: any;
  }>;
  capabilities?: Record<string, any>;
}

export interface Transaction {
  from: Address;
  to?: Address;
  gas?: HexString;
  gasPrice?: HexString;
  maxFeePerGas?: HexString;
  maxPriorityFeePerGas?: HexString;
  value?: HexString;
  data?: HexString;
  nonce?: HexString;
  accessList?: Array<{
    address: Address;
    storageKeys: Hash32[];
  }>;
  type?: HexString;
  chainId?: HexString;
}

export interface Filter {
  fromBlock?: HexString;
  toBlock?: HexString;
  address?: Address | Address[];
  topics?: Array<HexString | HexString[] | null>;
}

export interface Log {
  removed?: boolean;
  logIndex?: HexString;
  transactionIndex?: HexString;
  transactionHash: Hash32;
  blockHash?: Hash32;
  blockNumber?: HexString;
  address: Address;
  data: HexString;
  topics: HexString[];
}

export interface Block {
  number: HexString;
  hash: Hash32;
  parentHash: Hash32;
  nonce: HexString;
  sha3Uncles: Hash32;
  logsBloom: HexString;
  transactionsRoot: Hash32;
  stateRoot: Hash32;
  receiptsRoot: Hash32;
  miner: Address;
  difficulty?: HexString;
  totalDifficulty?: HexString;
  extraData: HexString;
  size: HexString;
  gasLimit: HexString;
  gasUsed: HexString;
  timestamp: HexString;
  transactions: Hash32[] | TransactionInfo[];
  uncles: Hash32[];
  baseFeePerGas?: HexString;
  withdrawalsRoot?: Hash32;
  withdrawals?: Array<{
    index: HexString;
    validatorIndex: HexString;
    address: Address;
    amount: HexString;
  }>;
  blobGasUsed?: HexString;
  excessBlobGas?: HexString;
  parentBeaconBlockRoot?: Hash32;
  mixHash?: Hash32;
}

export interface TransactionInfo {
  blockHash: Hash32;
  blockNumber: HexString;
  from: Address;
  gas: HexString;
  gasPrice?: HexString;
  maxFeePerGas?: HexString;
  maxPriorityFeePerGas?: HexString;
  hash: Hash32;
  input: HexString;
  nonce: HexString;
  to?: Address;
  transactionIndex: HexString;
  value: HexString;
  type?: HexString;
  accessList?: Array<{
    address: Address;
    storageKeys: Hash32[];
  }>;
  chainId?: number;
  v?: HexString;
  r?: HexString;
  s?: HexString;
  yParity?: HexString;
}

export interface TransactionReceipt {
  transactionHash: Hash32;
  transactionIndex: HexString;
  blockHash: Hash32;
  blockNumber: HexString;
  from: Address;
  to?: Address;
  cumulativeGasUsed: HexString;
  gasUsed: HexString;
  contractAddress?: Address;
  logs: Log[];
  logsBloom: HexString;
  status?: HexString;
  effectiveGasPrice: HexString;
  type?: HexString;
  blobGasUsed?: HexString;
  blobGasPrice?: HexString;
}

export interface FeeHistory {
  oldestBlock: HexString;
  baseFeePerGas: HexString[];
  baseFeePerBlobGas?: HexString[];
  gasUsedRatio: number[];
  blobGasUsedRatio?: number[];
  reward?: HexString[][];
}

export interface AccountProof {
  address: Address;
  accountProof: HexString[];
  balance: HexString;
  codeHash: Hash32;
  nonce: HexString;
  storageHash: Hash32;
  storageProof: Array<{
    key: HexString;
    value: HexString;
    proof: HexString[];
  }>;
}

export type SyncingStatus =
  | boolean
  | {
      startingBlock: HexString;
      currentBlock: HexString;
      highestBlock: HexString;
    };

export type Eip155Rpc = {
  methods: {
    // Wallet methods
    wallet_addEthereumChain: RpcMethod<[AddEthereumChainParameter], null>;
    wallet_watchAsset: RpcMethod<{ type: string; options: WatchAssetOptions }, boolean>;
    wallet_scanQRCode: RpcMethod<[string?], string>;
    wallet_sendCalls: RpcMethod<[SendCallsParameter], BatchResult>;
    wallet_getCallsStatus: RpcMethod<[string], BatchStatus>;
    wallet_getCapabilities: RpcMethod<[Address, HexString[]?], Record<string, any>>;

    // Signing methods
    personal_sign: RpcMethod<[HexString, Address], HexString>;
    eth_signTypedData_v4: RpcMethod<[Address, TypedData], HexString>;
    eth_decrypt: RpcMethod<[string, Address], string>;
    eth_getEncryptionPublicKey: RpcMethod<[Address], string>;

    // Account methods
    eth_accounts: RpcMethod<[], Address[]>;

    // Transaction methods
    eth_sendTransaction: RpcMethod<[Transaction], Hash32>;
    eth_sendRawTransaction: RpcMethod<[HexString], Hash32>;
    eth_estimateGas: RpcMethod<[Transaction, BlockNumberOrTagOrHash?], HexString>;

    // Block methods
    eth_blockNumber: RpcMethod<[], HexString>;
    eth_getBlockByHash: RpcMethod<[Hash32, boolean], Block | null>;
    eth_getBlockByNumber: RpcMethod<[BlockNumberOrTag, boolean], Block | null>;
    eth_getBlockTransactionCountByHash: RpcMethod<[Hash32], HexString | null>;
    eth_getBlockTransactionCountByNumber: RpcMethod<[BlockNumberOrTag], HexString | null>;
    eth_getUncleCountByBlockHash: RpcMethod<[Hash32], HexString | null>;
    eth_getUncleCountByBlockNumber: RpcMethod<[BlockNumberOrTag], HexString | null>;

    // Transaction info methods
    eth_getTransactionByHash: RpcMethod<[Hash32], TransactionInfo | null>;
    eth_getTransactionByBlockHashAndIndex: RpcMethod<[Hash32, HexString], TransactionInfo | null>;
    eth_getTransactionByBlockNumberAndIndex: RpcMethod<[BlockNumberOrTag, HexString], TransactionInfo | null>;
    eth_getTransactionCount: RpcMethod<[Address, BlockNumberOrTagOrHash], HexString>;
    eth_getTransactionReceipt: RpcMethod<[Hash32], TransactionReceipt | null>;

    // State methods
    eth_getBalance: RpcMethod<[Address, BlockNumberOrTagOrHash], HexString>;
    eth_getCode: RpcMethod<[Address, BlockNumberOrTagOrHash], HexString>;
    eth_getStorageAt: RpcMethod<[Address, HexString, BlockNumberOrTagOrHash], HexString>;
    eth_call: RpcMethod<[Transaction, BlockNumberOrTagOrHash?], HexString>;
    eth_getProof: RpcMethod<[Address, HexString[], BlockNumberOrTagOrHash], AccountProof>;

    // Gas and fee methods
    eth_gasPrice: RpcMethod<[], HexString>;
    eth_feeHistory: RpcMethod<[HexString, BlockNumberOrTag, number[]], FeeHistory>;

    // Filter and log methods
    eth_newFilter: RpcMethod<[Filter], HexString>;
    eth_newBlockFilter: RpcMethod<[], HexString>;
    eth_newPendingTransactionFilter: RpcMethod<[], HexString>;
    eth_uninstallFilter: RpcMethod<[HexString], boolean>;
    eth_getFilterChanges: RpcMethod<[HexString], (Log | Hash32)[]>;
    eth_getFilterLogs: RpcMethod<[HexString], Log[]>;
    eth_getLogs: RpcMethod<[Filter], Log[]>;

    // Subscription methods
    eth_subscribe: RpcMethod<[string, object?], HexString>;
    eth_unsubscribe: RpcMethod<[HexString], boolean>;

    // Network info methods
    eth_chainId: RpcMethod<[], HexString>;
    eth_syncing: RpcMethod<[], SyncingStatus>;
    web3_clientVersion: RpcMethod<[], string>;
  };
  events: ['eth_subscription', 'accountsChanged', 'chainChanged', 'connect', 'disconnect'];
};
