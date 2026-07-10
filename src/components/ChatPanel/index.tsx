import React, { useEffect, useRef } from "react";
import { usePanelStore } from "../../store";

/**
 * Base URL for the Starchild web app.
 * Production: https://iamstarchild.com
 * Override via window.__STARCHILD_BASE_URL__ for local development.
 */
const STARCHILD_BASE_URL =
  (typeof window !== "undefined" &&
    (window as any).__STARCHILD_BASE_URL__) ||
  "https://iamstarchild.com";

const STARCHILD_URL = STARCHILD_BASE_URL;
const PANEL_WIDTH = 448;

/**
 * Collapsible side panel containing the Starchild AI chat iframe.
 * Slides in from the right side of the viewport.
 * No header, no border — full-height iframe only.
 */
export const ChatPanel: React.FC<{ className?: string }> = ({ className }) => {
  const isOpen = usePanelStore((s) => s.isOpen);
  const close = usePanelStore((s) => s.close);
  const panelRef = useRef<HTMLDivElement>(null);

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
        zIndex: 9999,
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
      {/* Iframe container — full height, no header, no border.
          Always render iframe to preserve login state when panel is hidden. */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <iframe
          src={STARCHILD_URL}
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
