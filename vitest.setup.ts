import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom ships no WebSocket, so Node's undici implementation gets picked up and
// the chess live socket dials the real gateway during component tests. Its
// Event objects come from a different realm than jsdom's, and dispatching one
// throws ERR_INVALID_ARG_TYPE as an uncaught exception — which fails the run
// even when every test passes, and only once a connection actually completes,
// so it turns on network speed. No test needs a live socket, so a stub that
// never connects keeps the suite hermetic.
class InertWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly readyState = InertWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  send(): void {}
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

globalThis.WebSocket = InertWebSocket as unknown as typeof WebSocket;

// jsdom does not expose localStorage under this Node build, so every suite that
// touches a stored preference (interests, perp mode, the voice dock) failed on
// `window.localStorage` being undefined rather than on anything it asserted.
// The app only ever uses the synchronous string API, so a small in-memory store
// is a faithful stand-in and keeps the suite hermetic between files.
const browserStorage = typeof window === "undefined" ? null : window.localStorage;
const hasUsableLocalStorage =
  // Loose on purpose, so an undefined localStorage is caught as well as a null
  // one. Node 26 leaves the property defined but undefined unless the process
  // was started with --localstorage-file; a strict null check let that through
  // and the type checks below then threw, taking every suite in the run with it.
  browserStorage != null &&
  typeof browserStorage.getItem === "function" &&
  typeof browserStorage.setItem === "function" &&
  typeof browserStorage.removeItem === "function" &&
  typeof browserStorage.clear === "function";

if (typeof window !== "undefined" && !hasUsableLocalStorage) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    key: (index) => [...store.keys()][index] ?? null,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  };
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
}

// jsdom implements no media queries at all, so any component that asks whether
// the reader prefers reduced motion throws on `window.matchMedia` rather than
// failing on what it asserts. The carousel asks on mount. A stub that reports
// "no match" gives the suite the browser default, which is the behaviour we
// want under test: motion on, so a test can still observe a slide moving.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        // Superseded by addEventListener, but still on the interface and still
        // called by some libraries, so the stub has to carry them.
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

afterEach(() => {
  cleanup();
});
