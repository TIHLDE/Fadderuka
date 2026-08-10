/**
 * In-memory stand-in for `next/headers`.
 *
 * Route handlers read the request through `cookies()`/`headers()` and write the
 * session cookie back through the same store, so a test needs to both seed
 * incoming values and inspect what the handler set. Mock it per test file with:
 *
 *   vi.mock("next/headers", () => import("../helpers/next-headers"));
 */

export interface SetCookie {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

class CookieJar {
  private values = new Map<string, string>();
  /** Cookies the handler wrote, in order — asserted on directly by tests. */
  readonly set_: SetCookie[] = [];
  readonly deleted: string[] = [];

  get(name: string): { name: string; value: string } | undefined {
    const value = this.values.get(name);
    return value === undefined ? undefined : { name, value };
  }

  set(name: string, value: string, options: Record<string, unknown> = {}): void {
    this.values.set(name, value);
    this.set_.push({ name, value, options });
  }

  delete(name: string): void {
    this.values.delete(name);
    this.deleted.push(name);
  }

  seed(name: string, value: string): void {
    this.values.set(name, value);
  }

  reset(): void {
    this.values.clear();
    this.set_.length = 0;
    this.deleted.length = 0;
  }
}

export const cookieJar = new CookieJar();
export let requestHeaders = new Headers();

/** Reset the store between tests and optionally seed incoming request headers. */
export function resetNextHeaders(init?: HeadersInit): void {
  cookieJar.reset();
  requestHeaders = new Headers(init);
}

/** The cookie the handler most recently set under `name`. */
export function lastSetCookie(name: string): SetCookie | undefined {
  return [...cookieJar.set_].reverse().find((c) => c.name === name);
}

// The `next/headers` API surface the route handlers use. Both are async there.
export const cookies = () => Promise.resolve(cookieJar);
export const headers = () => Promise.resolve(requestHeaders);
