import type { DefaultRpcApi, MethodName, MethodParams, MethodReturn, RpcApi, RpcMethod, Scope } from './scopes';
import type { ScopeObject, SessionData, SessionProperties } from './session';

export type MultichainApiMethod = keyof MultichainApi<any>;
export type MultichainApiParams<T extends RpcApi, M extends MultichainApiMethod> = Parameters<MultichainApi<T>[M]>[0];
export type MultichainApiReturn<T extends RpcApi, M extends MultichainApiMethod> = ReturnType<MultichainApi<T>[M]>;

/**
 * Type for transport layer mapping to the multichain api methods
 *
 * @typeParam T - The RPC API type that defines available methods and their parameters
 */
export type MultichainApiClient<T extends RpcApi = DefaultRpcApi> = {
  /**
   * Creates a new session with the wallet
   *
   * @param params - Session creation parameters
   * @param params.requiredScopes - Required scopes that must be granted by the wallet
   * @param params.optionalScopes - Optional scopes that may be granted by the wallet
   * @param params.sessionProperties - Properties to be associated with the session
   * @returns A promise that resolves to the session data
   */
  createSession: MultichainApi<T>['wallet_createSession'];

  /**
   * Gets the current session data if a session exists
   *
   * @returns A promise that resolves to the session data or undefined if no session exists
   */
  getSession: MultichainApi<T>['wallet_getSession'];

  /**
   * Revokes the current session and disconnects from the wallet
   *
   * @param params - Session revoke parameters
   * @param params.scopes - Scopes that may be passed to partially revoke permission granted by the wallet
   * @returns A promise that resolves when the session is revoked
   */
  revokeSession: MultichainApi<T>['wallet_revokeSession'];

  /**
   * Invokes a method on the wallet for a specific scope
   *
   * @param params - Method invocation parameters
   * @param params.scope - The scope to invoke the method on
   * @param params.request - The method request details
   * @param params.request.method - The method name to invoke
   * @param params.request.params - The parameters for the method
   * @returns A promise that resolves to the method return value
   */
  invokeMethod: MultichainApi<T>['wallet_invokeMethod'];

  /**
   * Extends the RPC API with additional methods
   *
   * @returns A new MultichainApiClient with the extended RPC API
   */
  extendsRpcApi: <U extends RpcApi>() => MultichainApiClient<T & U>;

  /**
   * Registers a callback for notifications from the wallet
   *
   * @param callback - Function to call when a notification is received
   * @returns A function to remove the callback
   */
  onNotification: (callback: (data: unknown) => void) => () => void;
};

// Multichain API Methods
export type MultichainApi<T extends RpcApi> = {
  wallet_createSession: RpcMethod<CreateSessionParams<T>, SessionData>;
  wallet_getSession: RpcMethod<void, SessionData | undefined>;
  wallet_revokeSession: RpcMethod<RevokeSessionParams<T>, void>;
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

// wallet_revokeSession params
export type RevokeSessionParams<T extends RpcApi> = {
  scopes?: Scope<T>[];
};

// wallet_invokeMethod params
export type InvokeMethodParams<T extends RpcApi, S extends Scope<T>, M extends MethodName<T, S>> = {
  scope: S;
  request: {
    method: M;
    params: MethodParams<T, S, M>;
  };
};
