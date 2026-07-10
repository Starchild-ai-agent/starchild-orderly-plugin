import React from "react";
import { createInterceptor } from "@orderly.network/plugin-core";
import type { StarchildPluginOptions } from "./types/plugin";
import { AssistantButton } from "./components/AssistantButton";
import { ChatPanel } from "./components/ChatPanel";

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
  const { className } = options;

  return (SDK: any) => {
    SDK.registerPlugin({
      id: "starchild-ai-assistant",
      name: "Starchild AI Assistant",
      version: "1.0.0",
      orderlyVersion: ">=2.10.1",
      interceptors: [
        createInterceptor(
          "Layout.MainMenus",
          (Original: React.ComponentType<any>, props: any) => (
            <>
              <Original {...props} />
              <AssistantButton />
            </>
          )
        ),
        createInterceptor(
          "Trading.Layout.Desktop",
          (Original: React.ComponentType<any>, props: any) => (
            <>
              <Original {...props} />
              <ChatPanel className={className} />
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
