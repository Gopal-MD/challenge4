/**
 * @file setup.ts
 * Global Vitest test setup — runs before every test file.
 * Configures @testing-library/jest-dom matchers and auto-cleanup after each test.
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Auto-cleanup React component trees after every test
afterEach(() => {
  cleanup();
});

// Polyfill BroadcastChannel for jsdom (not natively available)
if (typeof globalThis.BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(name: string) { this.name = name; }
    postMessage(_data: unknown) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  (globalThis as any).BroadcastChannel = MockBroadcastChannel;
}

// Silence console.info/warn in tests (AI gateway logs)
vi.spyOn(console, 'info').mockImplementation(() => {});
