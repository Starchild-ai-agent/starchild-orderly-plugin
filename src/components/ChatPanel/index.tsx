import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelStore } from "../../store";
import { ORDERLY_AUTH_MSG } from "../../postMessage";
import type { OrderlyAuthorizePubkeyMessage } from "../../postMessage";
import type {
  OrderlyCredentialsRequest,
  OrderlyCredentialsResult,
} from "../../types/plugin";

const PANEL_WIDTH = 448;
const EMBED_SOURCE = "orderly-plugin";

type AuthStatus = "idle" | "pending" | "authorizing" | "success" | "error";

/**
 * Build the iframe URL for Starchild embed mode.
 * Appends source=orderly-plugin + optional hideLogo / logoUrl params.
 */
function buildIframeSrc(
  baseUrl: string,
  hideLogo?: boolean,
  logoUrl?: string,
  pluginVersion?: string,
): string {
  try {
    const url = new URL(baseUrl);
    if (!url.searchParams.has("source")) {
      url.searchParams.set("source", EMBED_SOURCE);
    }
    if (hideLogo) {
      url.searchParams.set("hideLogo", "1");
    }
    if (logoUrl) {
      url.searchParams.set("logoUrl", logoUrl);
    }
    if (pluginVersion) {
      url.searchParams.set("pluginVersion", pluginVersion);
    }
    url.searchParams.set("_t", String(Date.now()));
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    let u = `${baseUrl}${sep}source=${EMBED_SOURCE}`;
    if (hideLogo) u += "&hideLogo=1";
    if (logoUrl) u += `&logoUrl=${encodeURIComponent(logoUrl)}`;
    if (pluginVersion) u += `&pluginVersion=${encodeURIComponent(pluginVersion)}`;
    u += `&_t=${Date.now()}`;
    return u;
  }
}

/**
 * Collapsible side panel containing the Starchild AI chat iframe.
 * Includes an "Authorize Trading" button that drives the one-click Orderly
 * credential flow via postMessage between the host page and the iframe.
 */
export const ChatPanel: React.FC<{
  className?: string;
  baseUrl?: string;
  zIndex?: number;
  hideLogo?: boolean;
  logoUrl?: string;
  pluginVersion?: string;
  getOrderlyCredentials?: (
    req: OrderlyCredentialsRequest,
  ) => Promise<OrderlyCredentialsResult>;
}> = ({
  className,
  baseUrl = "https://iamstarchild.com",
  zIndex = 9999,
  hideLogo,
  logoUrl,
  pluginVersion,
  getOrderlyCredentials,
}) => {
  const isOpen = usePanelStore((s) => s.isOpen);
  const close = usePanelStore((s) => s.close);
  const panelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authError, setAuthError] = useState("");

  // Stable for the parent-page session. Rebuild only if baseUrl prop changes.
  const iframeSrc = useMemo(
    () => buildIframeSrc(baseUrl, hideLogo, logoUrl, pluginVersion),
    [baseUrl, hideLogo, logoUrl, pluginVersion],
  );

  // postMessage targetOrigin = the Starchild web origin derived from baseUrl.
  const targetOrigin = useMemo(() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return baseUrl;
    }
  }, [baseUrl]);

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

  // Current actionId being authorized (passed through the postMessage chain
  // so the iframe can dispatch Redux status updates when confirm completes).
  const currentActionId = useRef<string | undefined>(undefined);

  // Ask the iframe to fetch a one-time pubKey + nonce from the backend.
  const handleAuthorize = useCallback((actionId?: string) => {
    if (!getOrderlyCredentials) {
      setAuthStatus("error");
      setAuthError("One-click authorization is not available on this DEX.");
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      setAuthStatus("error");
      setAuthError("Chat panel is not ready yet.");
      return;
    }
    currentActionId.current = actionId;
    setAuthStatus("pending");
    setAuthError("");
    iframe.contentWindow.postMessage(
      { type: ORDERLY_AUTH_MSG.REQUEST, scope: "trade-only", actionId },
      targetOrigin,
    );
  }, [getOrderlyCredentials, targetOrigin]);

  // Listen for the iframe's TRIGGER (chat button) → start the same flow.
  useEffect(() => {
    if (!getOrderlyCredentials) return;
    const handleTrigger = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== ORDERLY_AUTH_MSG.TRIGGER) return;
      if (event.origin !== targetOrigin) return;
      handleAuthorize(data.actionId);
    };
    window.addEventListener("message", handleTrigger);
    return () => window.removeEventListener("message", handleTrigger);
  }, [getOrderlyCredentials, targetOrigin, handleAuthorize]);

  // Receive PUBKEY from iframe → run host callback → send RESULT/ERROR back.
  useEffect(() => {
    if (!getOrderlyCredentials) return;
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== ORDERLY_AUTH_MSG.PUBKEY) return;
      if (event.origin !== targetOrigin) return;

      const pub = data as OrderlyAuthorizePubkeyMessage;
      setAuthStatus("authorizing");
      try {
        const result = await getOrderlyCredentials({
          pubKey: pub.pubKey,
          nonce: pub.nonce,
          scope: "trade-only",
        });
        setAuthStatus("success");
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: ORDERLY_AUTH_MSG.RESULT,
              nonce: pub.nonce,
              ciphertext: result.ciphertext,
              accountId: result.accountId,
              brokerId: result.brokerId,
              networkId: result.networkId,
              actionId: pub.actionId || currentActionId.current,
            },
            targetOrigin,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setAuthStatus("error");
        setAuthError(msg);
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: ORDERLY_AUTH_MSG.ERROR, message: msg },
            targetOrigin,
          );
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [getOrderlyCredentials, targetOrigin]);

  // Reset auth state when the panel is closed.
  useEffect(() => {
    if (!isOpen) {
      setAuthStatus("idle");
      setAuthError("");
    }
  }, [isOpen]);

  const canAuthorize =
    authStatus !== "pending" && authStatus !== "authorizing";

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

      {authStatus === "error" && authError && (
        <div
          style={{
            padding: "6px 12px",
            background: "rgba(220, 38, 38, 0.15)",
            color: "#fca5a5",
            fontSize: "12px",
            flexShrink: 0,
          }}
        >
          {authError}
        </div>
      )}

      {/* Long-lived iframe for the parent-page session; panel only show/hides. */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <iframe
          ref={iframeRef}
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
