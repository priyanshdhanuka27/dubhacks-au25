import '@testing-library/jest-dom';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

(global as any).IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

(global as any).ResizeObserver = MockResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
(global as any).sessionStorage = sessionStorageMock;

// Mock fetch if not already mocked
if (!(global as any).fetch) {
  (global as any).fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
}

// Suppress console errors during tests unless explicitly needed
const originalError = console.error;

// Only set up console error suppression if we're in a test environment
if (typeof global !== 'undefined' && (global as any).beforeAll) {
  (global as any).beforeAll(() => {
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: ReactDOM.render is no longer supported')
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  (global as any).afterAll(() => {
    console.error = originalError;
  });
}