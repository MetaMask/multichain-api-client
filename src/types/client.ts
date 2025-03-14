import type { DefaultRpcApi, MethodName, MethodParams, MethodReturn, RpcApi, RpcMethod, Scope } from './rpc';
import type { CreateSessionParams, SessionData } from './session';

// Request
export type InvokeMethodParams<T extends RpcApi, S extends Scope<T>, M extends MethodName<T, S>> = {
  scope: S;
  request: {
    method: M;
    params: MethodParams<T, S, M>;
  };
};

// Multichain API Methods
export type MultichainApi<T extends RpcApi> = {
  wallet_createSession: RpcMethod<CreateSessionParams<T>, SessionData>;
  wallet_getSession: RpcMethod<void, SessionData | undefined>;
  wallet_revokeSession: RpcMethod<void, void>;
  wallet_invokeMethod: <S extends Scope<T>, M extends MethodName<T, S>>(
    params: InvokeMethodParams<T, S, M>,
  ) => Promise<MethodReturn<T, S, M>>;
};

export type MultichainApiMethod = keyof MultichainApi<any>;

export type MultichainApiParams<T extends RpcApi, M extends MultichainApiMethod> = Parameters<MultichainApi<T>[M]>[0];
export type MultichainApiReturn<T extends RpcApi, M extends MultichainApiMethod> = ReturnType<MultichainApi<T>[M]>;

export interface Transport {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  request: <T extends RpcApi, M extends MultichainApiMethod>(params: {
    method: M;
    params?: MultichainApiParams<T, M>;
  }) => Promise<MultichainApiReturn<T, M>>;
  onNotification: (callback: (data: unknown) => void) => void;
}

// Client interface that maps MultichainApi methods to more friendly method names
export type MultichainApiClient<T extends RpcApi = DefaultRpcApi> = {
  [K in keyof MultichainApi<T> as K extends `wallet_${infer Method}` ? Method : never]: MultichainApi<T>[K];
};
