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

Import and register the plugin in your Orderly app. One-click trading
authorization works out of the box — the plugin reads the connected account's
Orderly key from the SDK key store:

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
  tradingAuthorization: true,      // Built-in authorization (default true)
  brokerId: "your_broker_id",      // Overrides the SDK config store value
  networkId: "mainnet",            // Overrides the SDK config store value
})
```

## One-Click Trading Authorization

Enabled by default. An "Authorize Trading" button appears in the chat panel; users click it to authorize the Starchild AI agent to trade on their Orderly account — no manual key copying required.

### How it works

```
1. User clicks "Authorize Trading"
2. Starchild backend returns its RSA public key + a one-time nonce
3. The plugin's built-in credentials bridge (rendered inside OrderlyAppProvider)
   is called with { pubKey, nonce, scope }
4. The bridge:
   a. Reads the user's Orderly secret key from the SDK key store (useKeyStore)
   b. Base58-decodes it to the raw 32 bytes
   c. Encrypts those bytes with the RSA public key (RSA-OAEP SHA-256)
   d. Returns the base64 ciphertext + account info (accountId, brokerId, networkId)
5. Starchild backend decrypts the secret key, derives the Orderly key (ed25519 public key)
6. The credentials are written to the agent's container env (ORDERLY_*)
7. The AI agent can now query positions, place orders, etc.
```

`brokerId` and `networkId` are read from your Orderly config store (`useConfig`). Pass the `brokerId` / `networkId` options if your host does not populate them.

**Key security property**: the plaintext Orderly secret key only ever exists inside the credentials provider's call stack. It is returned only as RSA-encrypted ciphertext — never in the clear.

### Disabling authorization

```tsx
registerStarchildPlugin({ tradingAuthorization: false })
```

The chat panel then shows *"One-click authorization is not available on this DEX."* when users try to authorize.

### Custom override (advanced)

For custom key stores or custom account-selection/consent logic, pass `getOrderlyCredentials`. It takes precedence over the built-in bridge and receives `{ pubKey, nonce, scope }`:

```tsx
import { registerStarchildPlugin } from "starchild-orderly-plugin";

registerStarchildPlugin({
  getOrderlyCredentials: async (req) => {
    // req.pubKey — RSA public key (PEM, SPKI) for RSA-OAEP SHA-256 sealing
    // req.nonce  — one-time nonce (pass-through, for anti-replay)
    // req.scope  — "trade-only"

    // 1. Read the user's Orderly secret key (ed25519 private key, 32 bytes).
    //    The SDK key store stores it base58-encoded (no "ed25519:" prefix).
    const secretKey = base58Decode(keyPair.secretKey); // Uint8Array(32)

    // 2. Optionally: prompt the wallet to sign & register the access key

    // 3. Seal it with the RSA public key (see Encryption details below)

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
| `ORDERLY_ACCOUNT_ID` | `accountId` from the credentials provider | Orderly account ID (0x… format) |
| `ORDERLY_KEY` | Derived by backend from the decrypted seed | ed25519 public key (`ed25519:{base58}`) |
| `ORDERLY_SECRET` | `ed25519:{base58(secret_key)}` | Orderly secret key (ed25519 private key, same format as DEX UI) |
| `ORDERLY_BROKER_ID` | `brokerId` from the credentials provider | Your DEX's broker ID |
| `ORDERLY_NETWORK_ID` | `networkId` from the credentials provider (default: `mainnet`) | Orderly network |

## How It Works

The plugin uses Orderly SDK's interceptor system to inject UI and SDK-aware helpers:

1. **Floating Button** (`Layout.MainMenus`) — A draggable chat bubble button fixed on the screen. Click to open the AI assistant panel. The button supports:
   - **Drag** — reposition anywhere on screen (clamped to viewport)
   - **Edge drag** — hover near the edge and drag to resize (16px–128px)
   - **Scroll wheel** — resize without dragging
   - The button hides when the panel is open

2. **Credentials Bridge** (`Layout.MainMenus`, headless) — Reads the connected account's Orderly key from the SDK key store and publishes it (RSA-sealed) for the authorization flow.

3. **Chat Panel** (mounted once into `document.body` via `setup()`) — A collapsible side panel (448px wide) that slides in from the right. Contains an iframe embedding the Starchild AI chat interface. The iframe stays loaded when hidden to preserve login state.

When users open the panel, they can sign in to Starchild and interact with an AI assistant that has access to their Orderly account data (positions, orders, balances) for real-time trading insights.

## Requirements

Provided by any Orderly SDK v3 host app:

| Dependency | Version |
|---|---|
| `@orderly.network/plugin-core` | `>=3.0.0` |
| `@orderly.network/ui` | `>=3.0.0` |
| `@orderly.network/hooks` | `>=3.0.0` |
| `react` | `>=18` |
| `react-dom` | `>=18` |
| `zustand` | `>=4.5.0` |

## API

### `registerStarchildPlugin(options?)`

Returns a plugin registration function compatible with Orderly SDK's plugin system. All options are optional — call it with no arguments for the zero-config setup.

#### Options

| Property | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | — | Custom CSS class for the chat panel container |
| `baseUrl` | `string` | `https://iamstarchild.com` | Base URL for the Starchild web app |
| `buttonZIndex` | `number` | `9998` | z-index for the floating button |
| `panelZIndex` | `number` | `9999` | z-index for the chat panel |
| `hideLogo` | `boolean` | `false` | Hide the default "Starchild AI" brand in the panel header |
| `logoUrl` | `string` | — | Replace the default brand with a custom logo image URL |
| `tradingAuthorization` | `boolean` | `true` | Enable the built-in one-click authorization bridge. Ignored when `getOrderlyCredentials` is provided. |
| `brokerId` | `string` | SDK config store | Override for the broker ID used in the authorization result |
| `networkId` | `"mainnet" \| "testnet"` | SDK config store | Override for the network ID used in the authorization result |
| `getOrderlyCredentials` | `(req) => Promise<Result>` | built-in bridge | Custom credentials provider; takes precedence over the built-in bridge. See [One-Click Trading Authorization](#one-click-trading-authorization). |

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

# Unit tests
pnpm test
```

## License

[MIT](./LICENSE)
