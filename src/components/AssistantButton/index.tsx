import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePanelStore } from "../../store";

const MIN_SIZE = 16;
const MAX_SIZE = 128;
const DEFAULT_SIZE = 64;
/** Edge zone thickness in px — hover within this distance from the border triggers resize mode */
const EDGE_ZONE = 8;

type InteractionMode = "idle" | "drag" | "resize";

/**
 * Floating button that opens the Starchild AI chat panel.
 *
 * Performance: during drag/resize, position is updated via direct DOM manipulation
 * (no React re-renders). State is synced only on pointer-up.
 */
export const AssistantButton: React.FC = () => {
  const open = usePanelStore((s) => s.open);
  const isOpen = usePanelStore((s) => s.isOpen);

  const [size, setSize] = useState(DEFAULT_SIZE);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Refs for direct DOM manipulation during drag (avoids React re-renders)
  const btnRef = useRef<HTMLButtonElement>(null);
  const mode = useRef<InteractionMode>("idle");
  const hasMoved = useRef(false);
  const livePos = useRef({ x: 0, y: 0 });
  const liveSize = useRef(DEFAULT_SIZE);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0, startSize: 0 });

  // Keep livePos/liveSize in sync with state
  useEffect(() => {
    if (pos) livePos.current = { x: pos.x, y: pos.y };
  }, [pos]);
  useEffect(() => {
    liveSize.current = size;
  }, [size]);

  // Initialize position (bottom-right corner)
  useEffect(() => {
    if (pos === null) {
      const initial = {
        x: window.innerWidth - DEFAULT_SIZE - 24,
        y: window.innerHeight - DEFAULT_SIZE - 24,
      };
      setPos(initial);
      livePos.current = initial;
    }
  }, [pos]);

  // Clamp to viewport
  const clampXY = (x: number, y: number, s: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - s)),
    y: Math.max(0, Math.min(y, window.innerHeight - s)),
  });

  // Apply position directly to DOM (no re-render)
  const applyDOMPos = (x: number, y: number) => {
    const el = btnRef.current;
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };

  // Apply size directly to DOM
  const applyDOMSize = (s: number) => {
    const el = btnRef.current;
    if (!el) return;
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.style.borderRadius = `${s / 2}px`;
    // Scale the SVG inside
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", String(s));
      svg.setAttribute("height", String(s));
      svg.style.width = `${s}px`;
      svg.style.height = `${s}px`;
    }
  };

  // Check if mouse is near the edge
  const isOnEdge = (clientX: number, clientY: number): boolean => {
    const p = livePos.current;
    const s = liveSize.current;
    const relX = clientX - p.x;
    const relY = clientY - p.y;
    if (relX < 0 || relX > s || relY < 0 || relY > s) return false;
    return relX < EDGE_ZONE || relX > s - EDGE_ZONE || relY < EDGE_ZONE || relY > s - EDGE_ZONE;
  };

  // Cursor hint on hover
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode.current !== "idle") return;
    const el = btnRef.current;
    if (el) {
      el.style.cursor = isOnEdge(e.clientX, e.clientY) ? "nwse-resize" : "grab";
    }
  }, []);

  // ── Pointer down ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const onEdge = isOnEdge(e.clientX, e.clientY);
    mode.current = onEdge ? "resize" : "drag";
    hasMoved.current = false;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: livePos.current.x,
      elY: livePos.current.y,
      startSize: liveSize.current,
    };
    // Capture pointer on the button element (not SVG children)
    btnRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  // ── Pointer move — direct DOM updates ──
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (mode.current === "idle") return;

    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;

    if (!hasMoved.current && Math.abs(dx) + Math.abs(dy) > 4) {
      hasMoved.current = true;
    }
    if (!hasMoved.current) return;

    if (mode.current === "drag") {
      const clamped = clampXY(
        dragStart.current.elX + dx,
        dragStart.current.elY + dy,
        liveSize.current
      );
      livePos.current = clamped;
      applyDOMPos(clamped.x, clamped.y);
      const el = btnRef.current;
      if (el) el.style.cursor = "grabbing";
    } else if (mode.current === "resize") {
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragStart.current.startSize + delta));
      liveSize.current = newSize;
      applyDOMSize(newSize);
      // Re-clamp position
      const clamped = clampXY(livePos.current.x, livePos.current.y, newSize);
      livePos.current = clamped;
      applyDOMPos(clamped.x, clamped.y);
    }
  }, []);

  // ── Pointer up — sync to React state ──
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasMode = mode.current;
      mode.current = "idle";
      btnRef.current?.releasePointerCapture(e.pointerId);

      // Sync DOM state back to React
      setPos({ ...livePos.current });
      setSize(liveSize.current);

      // Click (no movement) → open panel
      if (!hasMoved.current && wasMode === "drag") {
        open();
      }

      // Reset cursor
      const el = btnRef.current;
      if (el) {
        el.style.cursor = isOnEdge(e.clientX, e.clientY) ? "nwse-resize" : "grab";
      }
    },
    [open]
  );

  // ── Scroll wheel resize — direct DOM, debounced state sync ──
  const wheelSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (wheelSyncTimer.current) clearTimeout(wheelSyncTimer.current);
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 4 : -4;
    const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, liveSize.current + delta));
    liveSize.current = newSize;
    applyDOMSize(newSize);
    const clamped = clampXY(livePos.current.x, livePos.current.y, newSize);
    livePos.current = clamped;
    applyDOMPos(clamped.x, clamped.y);
    // Debounced state sync (150ms after last scroll)
    if (wheelSyncTimer.current) clearTimeout(wheelSyncTimer.current);
    wheelSyncTimer.current = setTimeout(() => {
      setSize(liveSize.current);
      setPos({ ...livePos.current });
    }, 150);
  }, []);

  // Hidden when panel is open or position not initialized
  if (isOpen || !pos) return null;

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      aria-label="Open Starchild AI Assistant"
      title="Starchild AI Assistant"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9998,
        width: size,
        height: size,
        padding: 0,
        borderRadius: size / 2,
        border: "none",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        boxShadow: "0 6px 20px rgba(248, 70, 0, 0.35)",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        willChange: "left, top, width, height",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={{ display: "block", width: size, height: size, pointerEvents: "none" }}
      >
        <g clipPath="url(#starchild-btn-clip)">
          <rect width="63.4786" height="63.4786" rx="31.7393" fill="#F84600" />
          <path
            d="M13.49 17.7927L31.8225 7.21541L31.8225 94.2476L13.49 89.0836L13.49 17.7927Z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M13.49 17.7927L31.8225 7.21541L31.8225 94.2476L13.49 89.0836L13.49 17.7927Z"
            fill="url(#starchild-btn-grad0)"
          />
          <path
            d="M50.155 17.8874L31.8225 7.31013L31.8225 94.3423L50.155 89.1783L50.155 17.8874Z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M50.155 17.8874L31.8225 7.31013L31.8225 94.3423L50.155 89.1783L50.155 17.8874Z"
            fill="url(#starchild-btn-grad1)"
          />
        </g>
        <defs>
          <linearGradient
            id="starchild-btn-grad0"
            x1="52.9431"
            y1="-81.5209"
            x2="-3.57113"
            y2="87.9635"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" />
            <stop offset="0.618007" stopOpacity="0.97" />
            <stop offset="0.869792" stopColor="#525252" />
            <stop offset="0.961538" stopColor="#989898" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient
            id="starchild-btn-grad1"
            x1="18.3995"
            y1="-76.5091"
            x2="87.6662"
            y2="90.4206"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0.97" />
            <stop offset="0.724346" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <clipPath id="starchild-btn-clip">
            <rect width="63.4786" height="63.4786" rx="31.7393" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </button>
  );
};
