/**
 * CAIP-10 Account ID type.
 * Format: `<namespace>:<reference>:<address>`
 * Example: `eip155:1:0xabc123...`
 */
export type CaipAccountId = `${string}:${string}:${string}`;

/**
 * CAIP Chain ID type.
 * Format: `<namespace>:<reference>`
 * Example:
 *  - `eip155:1`
 *  - `solana:mainnet`
 *  - `tron:728126428`
 */
export type CaipChainId = `${string}:${string}`;

export type Json =
  | string
  | number
  | boolean
  | Json[]
  | {
      [prop: string]: Json;
    }
  | null;

/**
 * Represents a scope object as defined in CAIP-217.
 * Used to define permissions and capabilities for a specific chain or context.
 *
 * @property references - List of external references or resources this scope can access
 * @property methods - List of JSON-RPC methods this scope can invoke
 * @property notifications - List of notification types this scope can receive
 * @property accounts - List of CAIP-10 account identifiers this scope has access to
 */
export type ScopeObject = {
  references?: string[];
  methods: string[];
  notifications: string[];
  accounts?: CaipAccountId[];
};

/**
 * Properties that are scoped to specific contexts or chains.
 * Each key is a scope string (e.g., 'eip155:1') with associated JSON data.
 */
export type ScopedProperties = {
  [scopeString: CaipChainId]: Json;
};

/**
 * Properties that apply to the entire session, not scoped to specific chains.
 */
export type SessionProperties = {
  [key: string]: Json;
};

/**
 * Comprehensive session data including scopes and properties.
 * Represents a tracked session in local store.
 */
export type SessionData = {
  /** Map of chain IDs to their respective scope objects */
  sessionScopes: Record<CaipChainId, ScopeObject>;
  /** Chain-specific properties (not implemented in MetaMask yet) */
  scopedProperties?: ScopedProperties;
  /** Session-wide properties (not implemented in MetaMask yet) */
  sessionProperties?: SessionProperties;
  /** ISO timestamp when the session expires (not implemented in MetaMask yet) */
  expiry?: string;
};
