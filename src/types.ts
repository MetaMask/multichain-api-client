import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';

export interface Transport {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  request: ({ method, params }: { method: string; params?: Json }) => Promise<Json>;
  onNotification: (callback: (data: unknown) => void) => void;
}

export interface MultichainClient {
  createSession: (params: CreateSessionParams) => Promise<SessionData>;
  getSession: () => Promise<SessionData | undefined>;
  revokeSession: () => Promise<void>;
  invokeMethod: ({
    scope,
    request,
  }: { scope: CaipChainId; request: { method: string; params: Json } }) => Promise<Json>;
}

/**
 * Represents a scope object as defined in CAIP-217.
 * Used to define permissions and capabilities for a specific chain or context.
 */
export interface ScopeObject {
  /** List of external references or resources this scope can access */
  references?: string[];

  /** List of JSON-RPC methods this scope can invoke */
  methods?: string[];

  /** List of notification types this scope can receive */
  notifications?: string[];

  /** List of CAIP-10 account identifiers this scope has access to */
  accounts?: CaipAccountId[];
}

/**
 * Properties that are scoped to specific contexts or chains.
 * Each key is a scope string (e.g., 'eip155:1') with associated JSON data.
 */
export interface ScopedProperties {
  [scopeString: CaipChainId]: Json;
}

/**
 * Properties that apply to the entire session, not scoped to specific chains.
 */
export interface SessionProperties {
  [key: string]: Json;
}

export interface CreateSessionParams {
  requiredScopes?: Record<string, ScopeObject>;
  optionalScopes?: Record<string, ScopeObject>;
  //   scopedProperties?: ScopedProperties;
  //   sessionProperties?: SessionProperties;
}

/**
 * Comprehensive session data including scopes and properties.
 * Represents a tracked session in local store.
 */
export interface SessionData {
  /** CAIP-171 compliant session identifier (not used in MetaMask) */
  sessionId?: string;

  /** Map of chain IDs to their respective scope objects */
  sessionScopes: Record<CaipChainId, ScopeObject>;

  /** Chain-specific properties (not implemented in MetaMask yet) */
  scopedProperties?: ScopedProperties;

  /** Session-wide properties (not implemented in MetaMask yet) */
  sessionProperties?: SessionProperties;

  /** ISO timestamp when the session expires (not implemented in MetaMask yet) */
  expiry?: string;
}
