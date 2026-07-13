import React, { useEffect, useMemo, useRef } from "react";
import { usePanelStore } from "../../store";

const PANEL_WIDTH = 448;
const EMBED_SOURCE = "orderly-plugin";

/**
 * Build the iframe URL for Starchild embed mode.
 * Always appends source=orderly-plugin.
 *
 * Freshness policy:
 * - Panel open/close is pure show/hide; the iframe is NOT remounted on toggle.
 * - A fresh load happens when the parent page closes and reopens (full page
 *   lifecycle remounts this component).
 * - starchild-web embed cold-start checks /version.json and force-updates SW
 *   when the deployed version differs — that is what guarantees the latest shell.
 * - `_t` only helps avoid browser HTTP cache of the navigation request; it does
 *   not bypass SW navigateFallback by itself.
 */
function buildIframeSrc(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (!url.searchParams.has("source")) {
      url.searchParams.set("source", EMBED_SOURCE);
    }
    url.searchParams.set("_t", String(Date.now()));
    return url.toString();
  } catch {
    // Fallback if baseUrl is not a valid absolute URL
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}source=${EMBED_SOURCE}&_t=${Date.now()}`;
  }
}

/**
 * Collapsible side panel containing the Starchild AI chat iframe.
 * Slides in from the right side of the viewport.
 * No header, no border — full-height iframe only.
 *
 * Lifecycle:
 * - Show/hide panel: CSS transform only; keep the same iframe instance and session.
 * - Parent page close → reopen: component remounts naturally; iframe loads once
 *   for that page session; web embed cold-start may force SW update if version changed.
 */
export const ChatPanel: React.FC<{
  className?: string;
  baseUrl?: string;
  zIndex?: number;
}> = ({ className, baseUrl = "https://iamstarchild.com", zIndex = 9999 }) => {
  const isOpen = usePanelStore((s) => s.isOpen);
  const close = usePanelStore((s) => s.close);
  const panelRef = useRef<HTMLDivElement>(null);

  // Stable for the parent-page session. Rebuild only if baseUrl prop changes.
  const iframeSrc = useMemo(() => buildIframeSrc(baseUrl), [baseUrl]);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Listen for close panel message from iframe (Starchild header close button).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "starchild_close_panel"
      ) {
        close();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [close]);

  return (
    <div
      ref={panelRef}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: PANEL_WIDTH,
        maxWidth: "90vw",
        zIndex,
        transform: isOpen ? "translateX(0)" : `translateX(100%)`,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        background: "#1a1a2e",
        boxShadow: isOpen ? "-4px 0 24px rgba(0, 0, 0, 0.3)" : "none",
      }}
      role="dialog"
      aria-label="Starchild AI Assistant"
      aria-hidden={!isOpen}
    >
      {/* Long-lived iframe for the parent-page session; panel only show/hides. */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <iframe
          src={iframeSrc}
          title="Starchild AI Assistant"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "#1a1a2e",
          }}
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
};
