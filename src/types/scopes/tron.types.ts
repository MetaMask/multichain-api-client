import type { RpcMethod } from '.';

/**
 * A Base64-encoded message string.
 * @example
 * ```typescript
 * const message = "Hello, Tron!";
 * const base64Message = Buffer.from(message).toString('base64');
 * ```
 */
export type Base64Message = string;

/**
 * A TronWeb transaction in serialized base64 format.
 * @see https://github.com/tronprotocol/tronweb/blob/master/src/types/Transaction.ts
 *
 * To serialize a TronWeb transaction object to this format:
 * ```typescript
 * import TronWeb from 'tronweb';
 *
 * const tronWeb = new TronWeb({
 *   fullHost: 'https://api.trongrid.io'
 * });
 *
 * // Create your transaction
 * const transaction = await tronWeb.transactionBuilder.sendTrx(
 *   'TGehVcNhud84JDCGrNHKVz9jEAVKUpbuiv',
 *   1000000,
 *   'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8'
 * );
 *
 * // Serialize to base64
 * const txPb = tronWeb.utils.transaction.txJsonToPb(transaction);
 * const base64Transaction = Buffer.from(txPb.serializeBinary()).toString('base64');
 * ```
 *
 * To deserialize back to a transaction object:
 * ```typescript
 * const txBytes = Buffer.from(base64Transaction, 'base64');
 * const txPb = tronWeb.utils.transaction.txPbToTxID(txBytes);
 * const transaction = tronWeb.utils.transaction.txPbToJson(txPb);
 * ```
 */
export type Base64Transaction = string;

/**
 * A Tron address in Base58Check format, starting with 'T'.
 * @example "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8"
 */
export type TronAddress = `T${string}`;

/**
 * A signature.
 */
export type Signature = `${string}`;

/**
 * Signs a plain text message.
 * The signature can be used to verify ownership of the account.
 *
 * @param address - The Tron address that will sign the message
 * @param message - The message string in Base64 format to be signed
 * @returns An object containing the hexadecimal signature of the message
 */
export type SignMessageMethod = RpcMethod<
  {
    address: TronAddress;
    message: Base64Message;
  },
  { signature: Signature }
>;

/**
 * Signs a Tron transaction.
 * The transaction must be provided as a base64-encoded serialized transaction string.
 *
 * @param address - The Tron address that will sign the transaction
 * @param transaction - The Tron transaction in serialized base64 format
 * @returns An object containing the hexadecimal signature of the transaction
 */
export type SignTransactionMethod = RpcMethod<
  {
    address: TronAddress;
    transaction: Base64Transaction;
  },
  { signature: Signature }
>;

export type TronRpc = {
  methods: {
    signMessage: SignMessageMethod;
    signTransaction: SignTransactionMethod;
  };
  events: [];
};
