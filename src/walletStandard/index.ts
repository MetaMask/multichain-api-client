import type { CaipChainId } from '@metamask/utils';
import {
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  type SolanaChain,
} from '@solana/wallet-standard-chains';
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignAndSendTransactionOutput,
  SolanaSignIn,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  type SolanaSignMessageOutput,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionOutput,
} from '@solana/wallet-standard-features';
import type { IdentifierArray, Wallet } from '@wallet-standard/base';
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardDisconnect,
  type StandardDisconnectFeature,
  StandardEvents,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsNames,
  type StandardEventsOnMethod,
} from '@wallet-standard/features';
import { ReadonlyWalletAccount } from '@wallet-standard/wallet';
import type { MultichainClient } from '../types';
import { metamaskIcon } from './icon';

export class MetamaskWalletAccount extends ReadonlyWalletAccount {
  constructor({ address, publicKey, chains }: { address: string; publicKey: Uint8Array; chains: IdentifierArray }) {
    const features: IdentifierArray = [
      SolanaSignAndSendTransaction,
      SolanaSignTransaction,
      SolanaSignMessage,
      SolanaSignIn,
    ];
    super({ address, publicKey, chains, features });
    if (new.target === MetamaskWalletAccount) {
      Object.freeze(this);
    }
  }
}

export class MetamaskWallet implements Wallet {
  readonly #listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {};
  readonly version = '1.0.0' as const;
  readonly name = 'MetaMask (Injected pkg)' as const;
  readonly icon = metamaskIcon;
  readonly chains: SolanaChain[] = [SOLANA_MAINNET_CHAIN, SOLANA_DEVNET_CHAIN, SOLANA_TESTNET_CHAIN];
  readonly scope: CaipChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  #account: MetamaskWalletAccount | undefined;

  client: MultichainClient;

  get accounts() {
    return this.#account ? [this.#account] : [];
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignTransactionFeature &
    SolanaSignMessageFeature {
    return {
      [StandardConnect]: {
        version: this.version,
        connect: this.#connect,
      },
      [StandardDisconnect]: {
        version: this.version,
        disconnect: this.#disconnect,
      },
      [StandardEvents]: {
        version: this.version,
        on: this.#on,
      },
      [SolanaSignAndSendTransaction]: {
        version: this.version,
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: this.#signAndSendTransaction,
      },
      [SolanaSignTransaction]: {
        version: this.version,
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: this.#signTransaction,
      },
      [SolanaSignMessage]: {
        version: this.version,
        signMessage: this.#signMessage,
      },
    };
  }

  constructor({ client }: { client: MultichainClient }) {
    this.client = client;
  }

  #on: StandardEventsOnMethod = (event, listener) => {
    if (this.#listeners[event]) {
      this.#listeners[event].push(listener);
    } else {
      this.#listeners[event] = [listener];
    }
    return () => this.#off(event, listener);
  };

  #emit<E extends StandardEventsNames>(event: E, ...args: Parameters<StandardEventsListeners[E]>): void {
    for (const listener of this.#listeners[event] ?? []) {
      listener.apply(null, args);
    }
  }

  #off<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): void {
    this.#listeners[event] = this.#listeners[event]?.filter((existingListener) => listener !== existingListener);
  }

  #connect = async () => {
    if (!this.accounts.length) {
      const session = await this.client.createSession({
        optionalScopes: {
          [this.scope]: {
            methods: ['getGenesisHash', 'signMessage'],
            notifications: ['accountsChanged', 'chainChanged'],
            accounts: [`${this.scope}:6AwJL1LnMjwsB8GkJCPexEwznnhpiMV4DHv8QsRLtnNc`], // TODO: Remove hardcoded account when account selection UI is ready
          },
        },
      });

      const accounts = session.sessionScopes[this.scope].accounts;

      if (!accounts?.length) {
        throw new Error('No accounts found in MetaMask session');
      }

      const address = accounts[0]?.slice(this.scope.length + 1);

      const publicKey = new Uint8Array(Buffer.from(address, 'hex'));

      this.#account = new MetamaskWalletAccount({
        address,
        publicKey,
        chains: this.chains,
      });

      this.#emit('change', { accounts: this.accounts });
    }

    return { accounts: this.accounts };
  };

  #disconnect = async () => {
    this.#account = undefined;
    await this.client.revokeSession();
  };

  #signAndSendTransaction = async (...inputs: any): Promise<SolanaSignAndSendTransactionOutput[]> => {
    console.log('signAndSendTransaction', inputs);
    if (!this.#account) {
      throw new Error('No account found');
    }

    const res = await this.client.invokeMethod({
      scope: this.scope,
      request: {
        method: 'signAndSendTransaction',
        params: {
          account: { address: this.#account.address },
        },
      },
    });

    console.log('res', res);

    // @ts-ignore
    return [res.signature];
  };

  #signTransaction = async (/* ...inputs */): Promise<SolanaSignTransactionOutput[]> => {
    return await new Promise((_, reject) => reject(new Error('signTransaction: Not implemented')));
  };

  #signMessage = async (...inputs: any): Promise<SolanaSignMessageOutput[]> => {
    const { message: uint8ArrayMessage, account } = inputs[0];
    const message = Buffer.from(uint8ArrayMessage).toString('base64');

    const signMessageRes = await this.client.invokeMethod({
      scope: this.scope,
      request: {
        method: 'signMessage',
        params: {
          message,
          account: { address: account.address },
        },
      },
    });

    console.log('signature res', signMessageRes);

    return [signMessageRes] as unknown as SolanaSignMessageOutput[];
  };
}
