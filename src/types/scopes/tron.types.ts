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
 * A Tron address in Base58Check format, starting with 'T'.
 * @example "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8"
 */
export type TronAddress = `T${string}`;

/**
 * A signature.
 */
export type Signature = `0x${string}`;

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
 *
 * @param address - The Tron address that will sign the transaction
 * @param transaction - The Tron transaction object containing `raw_data_hex` and `type`
 * @returns An object containing the hexadecimal signature of the transaction
 */
export type SignTransactionMethod = RpcMethod<
  {
    address: TronAddress;
    transaction: {
      rawDataHex: string;
      type: string;
    };
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
