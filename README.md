# starchild-orderly-plugin

Let Starchild [[iamstarchild.com]](https://iamstarchild.com) keep your users more informed and engaged so they trade more successfully and have a better user experience:

## Features

- **Zero configuration**: install and add to your Orderly plugins array
- **Personal AI agent**: users can analyze positions, research markets across chains, and make more informed decisions without leaving the trading UI
- **80+ premium skills built in**: the agent comes loaded with Coinglass, CoinGecko, DeFiLlama, DeBank, TwelveData, TAAPI, and more, with no extra integration work
- **Seamless integration**: injects a floating chat button and collapsible side panel into your Orderly DEX
- **Dark theme**: designed to match Orderly's default dark UI
- **Keyboard accessible**: press Escape to close the chat panel
- **Draggable and resizable button**: drag the floating button anywhere on screen, scroll wheel or edge-drag to resize (16px to 128px)
- **Configurable**: customize base URL and z-index via plugin options

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
})
```

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
