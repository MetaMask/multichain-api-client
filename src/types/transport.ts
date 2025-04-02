import type { MultichainApiMethod, MultichainApiParams, MultichainApiReturn } from './multichainApi';
import type { RpcApi } from './scopes';

export type Transport = {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  request: <T extends RpcApi, M extends MultichainApiMethod>(params: {
    method: M;
    params?: MultichainApiParams<T, M>;
  }) => Promise<MultichainApiReturn<T, M>>;
  onNotification: (callback: (data: unknown) => void) => void;
};
