import type { RpcMethod } from '.';

/**
 * A Stellar account address (StrKey), starting with 'G'.
 * @example "GDQP2KPQGKIHYJOXNFPZMGLOJMPGADKZPQRBXF4ZZPRB6M3FQB6OGQ3G"
 */
export type StellarAddress = `G${string}`;

/**
 * Base64-encoded Stellar XDR.
 */
export type Base64Xdr = string;

/**
 * SEP-0043 signing options shared by message, transaction, and auth-entry signing.
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md
 */
export type Sep43SignOptions = {
  networkPassphrase?: string;
  address?: string | null;
};

/**
 * Signs a transaction envelope XDR and returns the signed XDR together with the signer address.
 */
export type SignTransactionMethod = RpcMethod<
  { xdr: Base64Xdr; opts?: Sep43SignOptions },
  { signedTxXdr: Base64Xdr; signerAddress: StellarAddress }
>;

/**
 * Signs a Soroban `SorobanAuthorizationEntry` XDR and returns the signed entry with the signer address.
 */
export type SignAuthEntryMethod = RpcMethod<
  { authEntry: Base64Xdr; opts?: Sep43SignOptions },
  { signedAuthEntry: Base64Xdr | null; signerAddress: StellarAddress }
>;

/**
 * Signs an arbitrary UTF-8 message and returns the base64-encoded signature with the signer address.
 */
export type SignMessageMethod = RpcMethod<
  { message: string; opts?: Sep43SignOptions },
  { signedMessage: string; signerAddress: StellarAddress }
>;

/**
 * RPC API for the Stellar namespace (`stellar:pubnet`, etc.) via `wallet_invokeMethod`.
 * Each method follows the SEP-0043 request/response shape.
 */
export type StellarRpc = {
  methods: {
    signTransaction: SignTransactionMethod;
    signAuthEntry: SignAuthEntryMethod;
    signMessage: SignMessageMethod;
  };
  events: [];
};
