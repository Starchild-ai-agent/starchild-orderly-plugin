import React from "react";
import { createInterceptor, type OrderlySDK } from "@orderly.network/plugin-core";
import type { StarchildPluginOptions } from "./types/plugin";
import { AssistantButton } from "./components/AssistantButton";
import { ChatPanel } from "./components/ChatPanel";

/** Default base URL for the Starchild web app */
const DEFAULT_BASE_URL = "https://iamstarchild.com";

/** Default z-index values */
const DEFAULT_BUTTON_Z_INDEX = 9998;
const DEFAULT_PANEL_Z_INDEX = 9999;

/** Interceptor target paths (must match SDK exactly, case-sensitive) */
const TARGETS = {
  MAIN_MENUS: "Layout.MainMenus",
  TRADING_DESKTOP: "Trading.Layout.Desktop",
} as const;

/**
 * Register the Starchild AI Assistant plugin with the Orderly SDK.
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
export function registerStarchildPlugin(options: StarchildPluginOptions = {}) {
  const {
    className,
    baseUrl = DEFAULT_BASE_URL,
    buttonZIndex = DEFAULT_BUTTON_Z_INDEX,
    panelZIndex = DEFAULT_PANEL_Z_INDEX,
  } = options;

  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "starchild-ai-assistant",
      name: "Starchild AI Assistant",
      version: "1.0.0",
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
        createInterceptor(
          TARGETS.TRADING_DESKTOP,
          (Original: React.ComponentType<any>, props: any) => (
            <>
              <Original {...props} />
              <ChatPanel className={className} baseUrl={baseUrl} zIndex={panelZIndex} />
            </>
          )
        ),
      ],
      onError: (error: Error) => {
        console.error("[Starchild Plugin] Error:", error);
      },
    });
  };
}
