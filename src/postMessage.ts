/**
 * postMessage protocol between the Orderly DEX host page (this plugin) and the
 * Starchild iframe for one-click Orderly trading authorization.
 *
 * Flow:
 *   iframe → plugin : TRIGGER  (chat button asks the plugin to start)
 *   plugin → iframe : REQUEST  (ask iframe to fetch a one-time pubKey + nonce)
 *   iframe → plugin : PUBKEY   (pubKey + nonce from the Starchild backend)
 *   plugin → iframe : RESULT   (ciphertext + accountId + brokerId + networkId)
 *   plugin → iframe : ERROR    (authorization failed / cancelled)
 */

export const ORDERLY_AUTH_MSG = {
  /** iframe → plugin: the chat "Authorize Trading" button asks the plugin to start */
  TRIGGER: "starchild_orderly_authorize_trigger",
  /** plugin → iframe: request the iframe to initiate the backend key fetch */
  REQUEST: "starchild_orderly_authorize_request",
  /** iframe → plugin: one-time pubKey + nonce from the Starchild backend */
  PUBKEY: "starchild_orderly_authorize_pubkey",
  /** plugin → iframe: sealed credentials result */
  RESULT: "starchild_orderly_authorize_result",
  /** plugin → iframe: authorization error / cancellation */
  ERROR: "starchild_orderly_authorize_error",
} as const;

export interface OrderlyAuthorizeTriggerMessage {
  type: typeof ORDERLY_AUTH_MSG.TRIGGER;
  actionId?: string;
}

export interface OrderlyAuthorizeRequestMessage {
  type: typeof ORDERLY_AUTH_MSG.REQUEST;
  scope: "trade-only";
  actionId?: string;
}

export interface OrderlyAuthorizePubkeyMessage {
  type: typeof ORDERLY_AUTH_MSG.PUBKEY;
  pubKey: string;
  nonce: string;
  actionId?: string;
}

export interface OrderlyAuthorizeResultMessage {
  type: typeof ORDERLY_AUTH_MSG.RESULT;
  nonce: string;
  ciphertext: string;
  accountId: string;
  brokerId: string;
  networkId?: "mainnet" | "testnet";
  actionId?: string;
}

export interface OrderlyAuthorizeErrorMessage {
  type: typeof ORDERLY_AUTH_MSG.ERROR;
  message: string;
}

export type OrderlyAuthorizeMessage =
  | OrderlyAuthorizeTriggerMessage
  | OrderlyAuthorizeRequestMessage
  | OrderlyAuthorizePubkeyMessage
  | OrderlyAuthorizeResultMessage
  | OrderlyAuthorizeErrorMessage;
