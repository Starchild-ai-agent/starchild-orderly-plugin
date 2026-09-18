/**
 * Orderly credentials request — passed to the host-injected callback.
 *
 * The Starchild backend generates a long-lived RSA keypair. The public key
 * is sent to the DEX host via this callback so the host can seal the
 * Orderly secret key (ed25519 private key) before returning it.
 *
 * Encryption requirements:
 *   - Algorithm: RSA-OAEP
 *   - Hash: SHA-256
 *   - Plaintext: 32-byte Orderly secret key (ed25519 private key, raw bytes)
 *   - Public key: `req.pubKey` (PEM-encoded SPKI format)
 *   - Output: base64-encoded ciphertext string
 *
 * Note: The Orderly secret key is displayed in the DEX UI as
 * "ed25519:{base58}" (e.g. "ed25519:AbC123...").
 * Strip the "ed25519:" prefix and base58-decode to get the raw 32-byte
 * private key, then encrypt those 32 bytes. The Starchild backend will
 * derive the corresponding Orderly key (public key) automatically after
 * decryption.
 *
 * Browser implementation (WebCrypto API, built into all modern browsers):
 *
 * ```javascript
 * // 1. Parse PEM → ArrayBuffer
 * const b64 = req.pubKey
 *   .replace(/-----BEGIN PUBLIC KEY-----/g, "")
 *   .replace(/-----END PUBLIC KEY-----/g, "")
 *   .replace(/\s/g, "");
 * const binary = atob(b64);
 * const keyBytes = new Uint8Array(binary.length);
 * for (let i = 0; i < binary.length; i++) {
 *   keyBytes[i] = binary.charCodeAt(i);
 * }
 *
 * // 2. Import the RSA public key
 * const cryptoKey = await crypto.subtle.importKey(
 *   "spki",
 *   keyBytes.buffer,
 *   { name: "RSA-OAEP", hash: "SHA-256" },
 *   false,
 *   ["encrypt"],
 * );
 *
 * // 3. Encrypt the Orderly secret key (32-byte ed25519 private key)
 * //    The DEX UI shows it as "ed25519:{base58}" — strip the prefix and
 * //    base58-decode to get the raw 32 bytes before encrypting.
 * const encrypted = await crypto.subtle.encrypt(
 *   { name: "RSA-OAEP" },
 *   cryptoKey,
 *   orderlySecretKey,  // Uint8Array(32) — raw bytes of the Orderly secret key
 * );
 *
 * // 4. Base64-encode the ciphertext
 * const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
 * ```
 *
 * Node.js implementation (using built-in `crypto` module):
 *
 * ```javascript
 * const crypto = require("crypto");
 * const pubKey = crypto.createPublicKey({ key: req.pubKey, format: "pem" });
 * const ciphertext = crypto.publicEncrypt(
 *   { key: pubKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
 *   Buffer.from(orderlySecretKey),  // 32-byte Orderly secret key
 * );
 * const ciphertextBase64 = ciphertext.toString("base64");
 * ```
 */
export interface OrderlyCredentialsRequest {
  /**
   * RSA public key in PEM format (SPKI).
   * Used to encrypt (seal) the Orderly secret key via RSA-OAEP SHA-256.
   * This is a long-lived key — the same public key is returned every time.
   *
   * Example: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----"
   */
  pubKey: string;

  /**
   * One-time nonce for this authorization session (anti-replay).
   * The DEX does not need to use this directly — it's for the Starchild
   * backend to track the session. Just pass it through if needed.
   */
  nonce: string;

  /**
   * Permission scope. Always "trade-only" — the key can place/cancel
   * orders but cannot withdraw funds.
   */
  scope: "trade-only";
}

/**
 * Sealed credentials returned by the DEX host callback.
 *
 * The Orderly secret key is only ever returned as RSA-OAEP ciphertext.
 * The plaintext secret key never crosses the callback boundary.
 */
export interface OrderlyCredentialsResult {
  /**
   * RSA-OAEP SHA-256 encrypted Orderly secret key (base64-encoded).
   *
   * The plaintext is exactly 32 bytes — the raw bytes of the Orderly
   * secret key (ed25519 private key). Encrypted using the `pubKey`
   * from the request.
   *
   * In the DEX UI, the secret key is displayed as "ed25519:{base58}"
   * (e.g. "ed25519:AbC123...").
   * Strip the "ed25519:" prefix and base58-decode to get the raw 32 bytes
   * before encrypting.
   *
   * After decryption, the Starchild backend will:
   *   - Write "ed25519:{base58(seed)}" as ORDERLY_SECRET (same format as DEX UI)
   *   - Derive the ed25519 public key and write it as ORDERLY_KEY
   *     (format: "ed25519:{base58(public_key)}")
   */
  ciphertext: string;

  /**
   * Orderly account ID (0x… hex format).
   * Example: "0x1234567890abcdef1234567890abcdef12345678"
   */
  accountId: string;

  /**
   * Orderly broker ID for this DEX.
   * Example: "woofi_pro", "demo"
   */
  brokerId: string;

  /**
   * Network ID. Optional — defaults to "mainnet" when omitted.
   * Set to "testnet" only when authorizing on the Orderly testnet.
   */
  networkId?: "mainnet" | "testnet";
}

/**
 * Configuration options for the Starchild AI Assistant plugin.
 */
export interface StarchildPluginOptions {
  /** Custom class name for the chat panel container */
  className?: string;
  /** Custom title displayed in the chat panel header */
  title?: string;
  /** Hide the default brand/logo in the chat panel header (default: false). */
  hideLogo?: boolean;
  /** Replace the default brand with a custom logo image URL. */
  logoUrl?: string;
  /** Base URL for the Starchild web app. Defaults to https://iamstarchild.com */
  baseUrl?: string;
  /** z-index for the floating button (default: 9998) */
  buttonZIndex?: number;
  /** z-index for the chat panel (default: 9999) */
  panelZIndex?: number;
  /**
   * Optional host-injected override for one-click trading authorization.
   *
   * When omitted, the plugin uses its built-in bridge, which reads the
   * Orderly key from the host's SDK key store (`useKeyStore`) inside
   * `OrderlyAppProvider`. Provide a callback only for custom key stores or
   * custom consent/account-selection logic; it takes precedence over the
   * built-in bridge.
   */
  getOrderlyCredentials?: (
    req: OrderlyCredentialsRequest,
  ) => Promise<OrderlyCredentialsResult>;
  /**
   * Set to `false` to disable the built-in one-click authorization flow.
   * Defaults to `true`. Ignored when `getOrderlyCredentials` is provided.
   */
  tradingAuthorization?: boolean;
  /** Overrides the `brokerId` read from the host's Orderly config store. */
  brokerId?: string;
  /** Overrides the `networkId` read from the host's Orderly config store. */
  networkId?: "mainnet" | "testnet";
}
