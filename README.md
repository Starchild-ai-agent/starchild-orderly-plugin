# starchild-orderly-plugin

Embed [Starchild AI](https://iamstarchild.com) assistant into your [Orderly Network](https://orderly.network) DEX. Chat with AI to query your Orderly account positions, orders, and trading analytics.

## Features

- **Zero configuration** — just install and add to your Orderly plugins array
- **AI-powered trading assistant** — ask questions about your positions, orders, and portfolio
- **Seamless integration** — injects a floating chat button and collapsible side panel into your Orderly DEX
- **Dark theme** — designed to match Orderly's default dark UI
- **Keyboard accessible** — press `Escape` to close the chat panel
- **Draggable & resizable button** — drag the floating button anywhere on screen, scroll wheel or edge-drag to resize (16px–128px)

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
| `@orderly.network/i18n` | `>=2.10.1` |
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
| `title` | `string` | — | Custom title for the chat panel |

### `LocaleProvider`

Optional React component that registers Starchild plugin translations with the Orderly i18n system.

```tsx
import { LocaleProvider } from "starchild-orderly-plugin";

<LocaleProvider>
  <App />
</LocaleProvider>
```

## Development

```bash
# Install dependencies
pnpm install

# Watch mode
pnpm dev

# Build
pnpm build
```

## License

[MIT](./LICENSE)
