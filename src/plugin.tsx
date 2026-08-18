import React from "react";
import { createRoot } from "react-dom/client";
import { createInterceptor, type OrderlySDK } from "@orderly.network/plugin-core";
import type { StarchildPluginOptions } from "./types/plugin";
import { AssistantButton } from "./components/AssistantButton";
import { ChatPanel } from "./components/ChatPanel";

/** Default base URL for the Starchild web app */
const DEFAULT_BASE_URL = "https://iamstarchild.com";

/** Plugin version — injected into iframe URL so clawd can version-gate prompts */
const PLUGIN_VERSION = "1.3.0";

/** Default z-index values */
const DEFAULT_BUTTON_Z_INDEX = 9998;
const DEFAULT_PANEL_Z_INDEX = 9999;

/** Interceptor target paths (must match SDK exactly, case-sensitive) */
const TARGETS = {
  MAIN_MENUS: "Layout.MainMenus",
} as const;

/** DOM container ID for the ChatPanel portal */
const PORTAL_CONTAINER_ID = "starchild-chat-panel-root";

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
export function registerStarchildPlugin(options: StarchildPluginOptions) {
  const {
    className,
    baseUrl = DEFAULT_BASE_URL,
    buttonZIndex = DEFAULT_BUTTON_Z_INDEX,
    panelZIndex = DEFAULT_PANEL_Z_INDEX,
    getOrderlyCredentials,
    hideLogo,
    logoUrl,
  } = options;
  const pluginVersion = PLUGIN_VERSION;

  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "starchild-ai-assistant",
      name: "Starchild AI Assistant",
      version: "1.2.3",
      orderlyVersion: ">=2.10.1",
      interceptors: [
        createInterceptor(
          TARGETS.MAIN_MENUS,
          (Original: React.ComponentType<any>, props: any) => (
            <>
              <Original {...props} />
              <AssistantButton zIndex={buttonZIndex} />
            </>
          )
        ),
      ],
      setup: () => {
        // Mount ChatPanel once into document.body so it survives page nav.
        // The panel's visibility is controlled by Zustand (usePanelStore).
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
            getOrderlyCredentials={getOrderlyCredentials}
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
