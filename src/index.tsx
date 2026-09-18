/**
 * starchild-orderly-plugin
 *
 * Embed Starchild AI assistant into your Orderly DEX.
 * Chat with AI to query your Orderly account positions and orders.
 */

export { registerStarchildPlugin } from "./plugin";
export type { StarchildCredentialsProvider } from "./credentials/provider";
export type {
  OrderlyCredentialsRequest,
  OrderlyCredentialsResult,
  StarchildPluginOptions,
} from "./types/plugin";
