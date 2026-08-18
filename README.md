# starchild-orderly-plugin

Let [Starchild](https://iamstarchild.com) keep your users more informed and engaged so they trade more successfully and have a better user experience:

## Features

- **Zero configuration**: install and add to your Orderly plugins array
- **Personal AI agent**: users can analyze positions, research markets across chains, and make more informed decisions without leaving the trading UI
- **80+ premium skills built in**: the agent comes loaded with Coinglass, CoinGecko, DeFiLlama, DeBank, TwelveData, TAAPI, and more, with no extra integration work
- **Seamless integration**: injects a floating chat button and collapsible side panel into your Orderly DEX
- **One-click trading authorization**: users can authorize the AI agent to trade on their Orderly account with a single click — no manual key copying
- **Customizable branding**: hide the default logo or replace it with your own
- **Dark theme**: designed to match Orderly's default dark UI
- **Keyboard accessible**: press Escape to close the chat panel
- **Draggable and resizable button**: drag the floating button anywhere on screen, scroll wheel or edge-drag to resize (16px to 128px)
- **Configurable**: customize base URL, z-index, logo, and trading authorization via plugin options

## Installation

```bash
npm install starchild-orderly-plugin
# or
pnpm add starchild-orderly-plugin
# or
yarn add starchild-orderly-plugin
```

## Usage

Import and register the plugin in your Orderly app:

```tsx
import { registerStarchildPlugin } from "starchild-orderly-plugin";
import "starchild-orderly-plugin/styles.css";

// In your OrderlyAppProvider setup:
<OrderlyAppProvider
  plugins={[registerStarchildPlugin()]}
>
  {/* Your app */}
</OrderlyAppProvider>
```

### With custom options

```tsx
registerStarchildPlugin({
  className: "my-custom-panel",    // Custom CSS class
  baseUrl: "https://iamstarchild.com",  // Custom Starchild URL
  buttonZIndex: 9998,             // z-index for floating button
  panelZIndex: 9999,               // z-index for chat panel
  hideLogo: false,                 // Hide the default "Starchild AI" brand
  logoUrl: "https://your-dex.com/logo.png",  // Replace with your own logo
})
```

## One-Click Trading Authorization

The plugin supports one-click trading authorization. When you inject a `getOrderlyCredentials` callback, an "Authorize Trading" button appears in the chat panel. Users click it to authorize the Starchild AI agent to trade on their Orderly account — no manual key copying required.

### How it works

```
1. User clicks "Authorize Trading"
2. Starchild backend returns its RSA public key + a one-time nonce
3. Your DEX callback (getOrderlyCredentials) is called with { pubKey, nonce, scope }
4. Your callback:
   a. Generates or reads the user's Orderly secret key (ed25519 private key, 32 bytes)
   b. Optionally prompts the user's wallet to sign and register the access key
   c. Encrypts the 32-byte secret key with the RSA public key (RSA-OAEP SHA-256)
   d. Returns the base64 ciphertext + account info
5. Starchild backend decrypts the secret key, derives the Orderly key (ed25519 public key)
6. The credentials are written to the agent's container env (ORDERLY_*)
7. The AI agent can now query positions, place orders, etc.
```

**Key security property**: the plaintext Orderly secret key only ever exists inside your callback's call stack. It is returned only as RSA-encrypted ciphertext — never in the clear.

### Implementing the callback

```tsx
import { registerStarchildPlugin } from "starchild-orderly-plugin";

registerStarchildPlugin({
  getOrderlyCredentials: async (req) => {
    // req.pubKey  — RSA public key (PEM format), used to encrypt the seed
    // req.nonce   — one-time nonce (pass-through, for anti-replay)
    // req.scope   — "trade-only" (the key can trade but cannot withdraw)

    // --- Your DEX logic ---
    // 1. Get the user's Orderly secret key.
    //    In the DEX UI it's displayed as "ed25519:{base58}" (e.g. "ed25519:AbC123...").
    //    Strip the "ed25519:" prefix and base58-decode to get the raw 32 bytes.
    const orderlySecretKeyStr = "ed25519:YourTestnetSecretKeyHere"; // TODO: replace with actual
    const orderlySecretKey = b58Decode(orderlySecretKeyStr.replace("ed25519:", "")); // Uint8Array(32)

    // 2. Optionally: prompt wallet to sign & register the access key
    //    (e.g. via Orderly SDK's EIP-712 signing flow)

    // 3. Encrypt the secret key with the provided RSA public key
    //    Using the browser's built-in WebCrypto API (no libraries needed):
    const b64 = req.pubKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\s/g, "");
    const binary = atob(b64);
    const keyBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      keyBytes[i] = binary.charCodeAt(i);
    }
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      keyBytes.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      cryptoKey,
      orderlySecretKey,
    );
    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

    // 4. Return the sealed credentials
    return {
      ciphertext,                                    // base64 RSA-OAEP ciphertext
      accountId: "0x1234567890abcdef1234567890abcdef12345678",  // Orderly account ID
      brokerId: "your_broker_id",                    // Your DEX's broker ID
      networkId: "mainnet",                          // optional, defaults to "mainnet"
    };
  },
});
```

### Encryption details

| Property | Value |
|----------|-------|
| Algorithm | RSA-OAEP |
| Hash | SHA-256 |
| Plaintext | 32-byte Orderly secret key (ed25519 private key, raw bytes) |
| Public key | `req.pubKey` (PEM-encoded SPKI format, provided by Starchild) |
| Output | base64-encoded ciphertext string |

The public key is **long-lived** — the same key is returned every time. You can cache it.

### What gets written to the agent env

After successful authorization, these 5 environment variables are written to the agent's container:

| Env var | Source | Description |
|---------|--------|-------------|
| `ORDERLY_ACCOUNT_ID` | `accountId` from your callback | Orderly account ID (0x… format) |
| `ORDERLY_KEY` | Derived by backend from the decrypted seed | ed25519 public key (`ed25519:{base58}`) |
| `ORDERLY_SECRET` | `ed25519:{base58(secret_key)}` | Orderly secret key (ed25519 private key, same format as DEX UI) |
| `ORDERLY_BROKER_ID` | `brokerId` from your callback | Your DEX's broker ID |
| `ORDERLY_NETWORK_ID` | `networkId` from your callback (default: `mainnet`) | Orderly network |

## How It Works

The plugin uses Orderly SDK's interceptor system to inject two UI elements:

1. **Floating Button** (`Layout.MainMenus`) — A draggable chat bubble button fixed on the screen. Click to open the AI assistant panel. The button supports:
   - **Drag** — reposition anywhere on screen (clamped to viewport)
   - **Edge drag** — hover near the edge and drag to resize (16px–128px)
   - **Scroll wheel** — resize without dragging
   - The button hides when the panel is open

2. **Chat Panel** (`Trading.Layout.Desktop`) — A collapsible side panel (448px wide) that slides in from the right. Contains an iframe embedding the Starchild AI chat interface. The iframe stays loaded when hidden to preserve login state.

When users open the panel, they can sign in to Starchild and interact with an AI assistant that has access to their Orderly account data (positions, orders, balances) for real-time trading insights.

## Requirements

| Dependency | Version |
|---|---|
| `@orderly.network/plugin-core` | `>=2.10.1` |
| `@orderly.network/ui` | `>=2.10.1` |
| `@orderly.network/hooks` | `>=2.10.1` |
| `react` | `>=18` |
| `react-dom` | `>=18` |
| `zustand` | `>=4.5.0` |

## API

### `registerStarchildPlugin(options?)`

Returns a plugin registration function compatible with Orderly SDK's plugin system.

#### Options

| Property | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | — | Custom CSS class for the chat panel container |
| `baseUrl` | `string` | `https://iamstarchild.com` | Base URL for the Starchild web app |
| `buttonZIndex` | `number` | `9998` | z-index for the floating button |
| `panelZIndex` | `number` | `9999` | z-index for the chat panel |
| `hideLogo` | `boolean` | `false` | Hide the default "Starchild AI" brand in the panel header |
| `logoUrl` | `string` | — | Replace the default brand with a custom logo image URL |
| `getOrderlyCredentials` | `(req) => Promise<Result>` | **Required** | One-click trading authorization callback. See [One-Click Trading Authorization](#one-click-trading-authorization) above. |

#### `getOrderlyCredentials` callback

**Request** (`OrderlyCredentialsRequest`):

| Field | Type | Description |
|-------|------|-------------|
| `pubKey` | `string` | RSA public key (PEM format). Used to encrypt the ed25519 seed via RSA-OAEP SHA-256. |
| `nonce` | `string` | One-time nonce for anti-replay. Pass-through — the DEX does not need to use it. |
| `scope` | `"trade-only"` | Permission scope. The key can trade but cannot withdraw. |

**Response** (`OrderlyCredentialsResult`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ciphertext` | `string` | Yes | Base64-encoded RSA-OAEP SHA-256 ciphertext of the 32-byte ed25519 seed. |
| `accountId` | `string` | Yes | Orderly account ID (0x… hex format). |
| `brokerId` | `string` | Yes | Your DEX's broker ID (e.g. `"woofi_pro"`, `"demo"`). |
| `networkId` | `"mainnet" \| "testnet"` | No | Network. Defaults to `"mainnet"` when omitted. |

## Development

```bash
# Install dependencies
pnpm install

# Watch mode
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck
```

## License

[MIT](./LICENSE)
