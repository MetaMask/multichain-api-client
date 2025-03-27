import type { DefaultRpcApi, MethodName, MethodParams, MethodReturn, RpcApi, RpcMethod, Scope } from './scopes';
import type { ScopeObject, SessionData, SessionProperties } from './session';

export type MultichainApiMethod = keyof MultichainApi<any>;
export type MultichainApiParams<T extends RpcApi, M extends MultichainApiMethod> = Parameters<MultichainApi<T>[M]>[0];
export type MultichainApiReturn<T extends RpcApi, M extends MultichainApiMethod> = ReturnType<MultichainApi<T>[M]>;

// Type for transport layer mapping to the multichain api methods
export type MultichainApiClient<T extends RpcApi = DefaultRpcApi> = {
  createSession: MultichainApi<T>['wallet_createSession'];
  getSession: MultichainApi<T>['wallet_getSession'];
  revokeSession: MultichainApi<T>['wallet_revokeSession'];
  invokeMethod: MultichainApi<T>['wallet_invokeMethod'];
  extendsRpcApi: <U extends RpcApi>() => MultichainApiClient<T & U>;
  onNotification: (callback: (data: unknown) => void) => void;
};

// Multichain API Methods
export type MultichainApi<T extends RpcApi> = {
  wallet_createSession: RpcMethod<CreateSessionParams<T>, SessionData>;
  wallet_getSession: RpcMethod<void, SessionData | undefined>;
  wallet_revokeSession: RpcMethod<void, void>;
  wallet_invokeMethod: <S extends Scope<T>, M extends MethodName<T, S>>(
    params: InvokeMethodParams<T, S, M>,
  ) => MethodReturn<T, S, M>;
};

// wallet_createSession params
export type CreateSessionParams<T extends RpcApi> = {
  requiredScopes?: Record<Scope<T>, ScopeObject>;
  optionalScopes?: Record<Scope<T>, ScopeObject>;
  sessionProperties?: SessionProperties;
};

// wallet_invokeMethod params
export type InvokeMethodParams<T extends RpcApi, S extends Scope<T>, M extends MethodName<T, S>> = {
  scope: S;
  request: {
    method: M;
    params: MethodParams<T, S, M>;
  };
};
