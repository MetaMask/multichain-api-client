import { registerWallet } from '@wallet-standard/wallet';
import { isChromeRuntime } from './helpers/utils';
import { getMultichainClient } from './multichainClient';
import { getExternallyConnectableTransport } from './transports/externallyConnectableTransport';
import type { MultichainApiClient } from './types/multichainApi';
import type { Transport } from './types/transport';
import { MetamaskWallet } from './walletStandard';

function getDefaultTransport(params: { extensionId?: string }): Transport {
  const isChrome = isChromeRuntime();
  return isChrome ? getExternallyConnectableTransport(params) : ({} as Transport); // TODO: Implement stream transport
}

function getWalletStandard({ client }: { client: MultichainApiClient }) {
  return new MetamaskWallet({ client });
}

async function registerSolanaWalletStandard(params: { extensionId?: string }) {
  const client = await getMultichainClient({ transport: getDefaultTransport(params) });

  const wallet = getWalletStandard({ client });

  registerWallet(wallet);
}

export { registerWallet, getMultichainClient, getDefaultTransport, getWalletStandard, registerSolanaWalletStandard };
