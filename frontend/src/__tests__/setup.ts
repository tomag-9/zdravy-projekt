import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';

// Default findBy*/waitFor timeout (1000ms) flakes under CI load when many
// test files run in parallel and the event loop gets contended — a query
// that resolves fine locally can occasionally miss the window on a busy
// runner (OrderPage.test.tsx, seen 3.9.2026 on PR #581). 1000ms was never a
// meaningful assertion about app speed, just the library default. 4000ms
// still wasn't enough on a busier runner (same test, same failure mode,
// PR #691, 15.9.2026) — bumped again. Stays well under the 15000ms global
// `testTimeout` (vite.config.ts) so a genuinely hung query still fails.
configure({ asyncUtilTimeout: 8000 });

// jsdom doesn't implement window.matchMedia; mock it so hooks using it don't crash.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
