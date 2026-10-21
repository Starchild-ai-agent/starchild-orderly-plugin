import React from "react";
import { createRoot } from "react-dom/client";
import { createInterceptor, type OrderlySDK } from "@orderly.network/plugin-core";
import type {
  StarchildPluginConfig,
  StarchildPluginOptions,
} from "./types/plugin";
import { AssistantButton } from "./components/AssistantButton";
import { ChatPanel } from "./components/ChatPanel";
import { CredentialsBridge } from "./components/CredentialsBridge";
import { getCredentials } from "./credentials/provider";

/** Default base URL for the Starchild web app */
const DEFAULT_BASE_URL = "https://iamstarchild.com";

/** Plugin version — injected into iframe URL so clawd can version-gate prompts */
const PLUGIN_VERSION = "1.4.1";

/** Default z-index values */
const DEFAULT_BUTTON_Z_INDEX = 9998;
const DEFAULT_PANEL_Z_INDEX = 9999;

/** DOM container ID for the ChatPanel portal */
const PORTAL_CONTAINER_ID = "starchild-chat-panel-root";

type StarchildPluginRegistrar = (SDK: OrderlySDK) => void;

/**
 * Register the Starchild AI Assistant plugin with the Orderly SDK.
 *
 * The AssistantButton is injected via the MainMenus interceptor.
 * The ChatPanel is mounted once via setup() into document.body using a React
 * Portal root, so it survives page navigation without reloading the iframe.
 *
 * @example
 * ```tsx
 * import { registerStarchildPlugin } from "starchild-orderly-plugin";
 *
 * <OrderlyAppProvider
 *   plugins={[registerStarchildPlugin()]}
 * >
 *   ...
 * </OrderlyAppProvider>
 * ```
 */
// The first overload exposes only the JSON-configurable options so
// `orderly-devkit schema` can derive configSchema.json without warning about
// the runtime-only callback. Callers can still pass the callback (second
// overload).
export function registerStarchildPlugin(
  options?: StarchildPluginConfig,
): StarchildPluginRegistrar;
export function registerStarchildPlugin(
  options?: StarchildPluginOptions,
): StarchildPluginRegistrar;
export function registerStarchildPlugin(
  options: StarchildPluginOptions = {},
): StarchildPluginRegistrar {
  const {
    className,
    baseUrl = DEFAULT_BASE_URL,
    buttonZIndex = DEFAULT_BUTTON_Z_INDEX,
    panelZIndex = DEFAULT_PANEL_Z_INDEX,
    getOrderlyCredentials,
    hideLogo,
    logoUrl,
    tradingAuthorization,
    brokerId,
    networkId,
  } = options;
  const pluginVersion = PLUGIN_VERSION;

  // A custom callback always wins; otherwise the built-in bridge supplies
  // credentials unless explicitly disabled.
  const useCredentialsBridge =
    !getOrderlyCredentials && tradingAuthorization !== false;
  const credentialsProvider =
    getOrderlyCredentials ?? (useCredentialsBridge ? getCredentials : undefined);

  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "starchild-ai-assistant",
      name: "Starchild AI Assistant",
      version: pluginVersion,
      orderlyVersion: ">=3.0.0",
      interceptors: [
        createInterceptor(
          "Layout.MainMenus",
          (Original: React.ComponentType<any>, props: any) => (
            <>
              <Original {...props} />
              <AssistantButton zIndex={buttonZIndex} />
              {useCredentialsBridge && (
                <CredentialsBridge brokerId={brokerId} networkId={networkId} />
              )}
            </>
          )
        ),
      ],
      setup: () => {
        // Mount ChatPanel once into document.body so it survives page nav.
        // The panel's visibility is controlled by the module-level panel store
        // (usePanelStore).
        let container = document.getElementById(PORTAL_CONTAINER_ID);
        if (!container) {
          container = document.createElement("div");
          container.id = PORTAL_CONTAINER_ID;
          document.body.appendChild(container);
        }
        const root = createRoot(container);
        root.render(
          <ChatPanel
            className={className}
            baseUrl={baseUrl}
            zIndex={panelZIndex}
            getOrderlyCredentials={credentialsProvider}
            hideLogo={hideLogo}
            logoUrl={logoUrl}
            pluginVersion={pluginVersion}
          />
        );
      },
      onError: (error: Error) => {
        console.error("[Starchild Plugin] Error:", error);
      },
    });
  };
}
