/**
 * Configuration options for the Starchild AI Assistant plugin.
 */
export interface StarchildPluginOptions {
  /** Custom class name for the chat panel container */
  className?: string;
  /** Custom title displayed in the chat panel header */
  title?: string;
  /** Base URL for the Starchild web app. Defaults to https://iamstarchild.com */
  baseUrl?: string;
  /** z-index for the floating button (default: 9998) */
  buttonZIndex?: number;
  /** z-index for the chat panel (default: 9999) */
  panelZIndex?: number;
}
