import { useSyncExternalStore } from "react";

/**
 * State for the Starchild chat panel visibility.
 *
 * The AssistantButton is rendered through the MainMenus interceptor while the
 * ChatPanel lives in its own React root (mounted by `setup()`), so they cannot
 * share a React context. A module-level store keeps both in sync.
 */
interface PanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const listeners = new Set<() => void>();

let state: PanelState;

const setState = (
  patch: Partial<PanelState> | ((current: PanelState) => Partial<PanelState>),
): void => {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

state = {
  isOpen: false,
  open: () => setState({ isOpen: true }),
  close: () => setState({ isOpen: false }),
  toggle: () => setState((current) => ({ isOpen: !current.isOpen })),
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

export function usePanelStore<T>(selector: (current: PanelState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()));
}
