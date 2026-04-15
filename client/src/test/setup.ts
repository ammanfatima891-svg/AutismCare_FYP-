import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});

const locationHref = { value: 'http://localhost/' };
Object.defineProperty(window, 'location', {
  configurable: true,
  writable: true,
  value: {
    get href() {
      return locationHref.value;
    },
    set href(next: string) {
      locationHref.value = String(next);
    },
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
});

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

afterEach(() => {
  cleanup();
});
