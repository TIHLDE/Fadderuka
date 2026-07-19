import { vi } from "vitest";

/**
 * A tiny `fetch` stub for the two external APIs (Vipps and TIHLDE).
 *
 * Deliberately strict: an unmatched request throws instead of returning a
 * default. A test that silently talks to an unstubbed endpoint would otherwise
 * look like it passed while the code did something entirely different.
 */

export interface FetchCall {
  method: string;
  /** Path + query only, e.g. `/epayment/v1/payments/fadderuka-x-1`. */
  path: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

type Responder = Response | ((call: FetchCall) => Response | Promise<Response>);

interface Route {
  method: string;
  pattern: string | RegExp;
  responder: Responder;
  /** Consume once (queued responses let a retry see a different result). */
  once: boolean;
  used: boolean;
}

/** Build a JSON `Response`, defaulting to 200. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Build an error `Response` with a plain-text body, as Vipps/Lepton return. */
export function text(body: string, status: number): Response {
  return new Response(body, { status });
}

export class FetchMock {
  private routes: Route[] = [];
  readonly calls: FetchCall[] = [];

  /** Register a handler for every matching request. */
  on(method: string, pattern: string | RegExp, responder: Responder): this {
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      responder,
      once: false,
      used: false,
    });
    return this;
  }

  /**
   * Register a handler consumed by the first matching request only. Later
   * requests fall through to the next matching route — this is how a test says
   * "first call fails, the retry succeeds".
   */
  once(method: string, pattern: string | RegExp, responder: Responder): this {
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      responder,
      once: true,
      used: false,
    });
    return this;
  }

  /** Calls matching a path fragment, for asserting what we sent. */
  callsTo(pattern: string | RegExp): FetchCall[] {
    return this.calls.filter((c) => matches(c.path, pattern));
  }

  reset(): void {
    this.routes = [];
    this.calls.length = 0;
  }

  /** The stand-in passed to `vi.stubGlobal("fetch", …)`. */
  readonly handler = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);

    const call: FetchCall = {
      method,
      path: `${parsed.pathname}${parsed.search}`,
      url,
      headers: normalizeHeaders(init?.headers),
      body: parseBody(init?.body),
    };
    this.calls.push(call);

    const route = this.routes.find(
      (r) =>
        r.method === method &&
        matches(call.path, r.pattern) &&
        !(r.once && r.used),
    );

    if (!route) {
      throw new Error(
        `Uventet fetch i test: ${method} ${call.path}\n` +
          `Registrerte ruter: ${
            this.routes.map((r) => `${r.method} ${String(r.pattern)}`).join(", ") ||
            "(ingen)"
          }`,
      );
    }
    route.used = true;

    const responder = route.responder;
    const response =
      typeof responder === "function" ? await responder(call) : responder;
    // A Response body can only be read once; clone so a reused responder works.
    return response.clone();
  };
}

/**
 * String patterns match the path exactly (query string aside). Prefix matching
 * would make `/payments/{ref}` swallow `/payments/{ref}/capture`; use a RegExp
 * when a test genuinely wants a fuzzy match.
 */
function matches(path: string, pattern: string | RegExp): boolean {
  if (typeof pattern !== "string") return pattern.test(path);
  return path === pattern || path.startsWith(`${pattern}?`);
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  new Headers(headers).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

/** The mock installed by `tests/setup.ts`; shared by every test. */
export const fetchMock = new FetchMock();

/** Install the stub. Called once from the global setup file. */
export function installFetchMock(): void {
  vi.stubGlobal("fetch", fetchMock.handler);
}
