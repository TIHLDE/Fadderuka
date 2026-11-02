import { env } from "~/env";

/**
 * The origin students reach us on, for building redirects.
 *
 * Not `new URL(request.url).origin`: behind Drift's nginx the standalone Next
 * server sees its own bind address, so that comes out as `http://0.0.0.0:3000`
 * and the browser is sent somewhere it cannot reach. `APP_URL` is the public
 * address (and is already required for the Photon redirect URI), so it wins;
 * the request's own origin is only a fallback for local development.
 */
export function publicOrigin(request: Request): string {
  if (env.APP_URL) return new URL(env.APP_URL).origin;
  return new URL(request.url).origin;
}
