import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vipps webhook request authentication.
 *
 * Vipps signs every callback with HMAC-SHA256 over the request method, path,
 * host, date and a hash of the raw body:
 * https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
 *
 * Settling a payment already re-verifies everything against the Vipps API, so
 * a forged webhook can never mark anyone paid. What it *could* do is name a
 * real reference and make us capture a reservation early. Checking the
 * signature closes that, and means we stop doing work on behalf of anyone who
 * simply knows an order id.
 *
 * Ported from the equivalent implementation in Photon (`apps/api/src/lib/vipps.ts`).
 */

export interface VippsWebhookRequestParts {
  /** HTTP method, e.g. "POST". */
  method: string;
  /** Path and query string, e.g. "/api/vipps/webhook". */
  pathAndQuery: string;
  /** The `Host` header the request was sent to. */
  host: string;
  /** The `x-ms-date` (or `date`) header. */
  date: string;
  /** The `x-ms-content-sha256` header: base64 SHA-256 of the body. */
  contentSha256: string;
  /** The `Authorization` header. */
  authorization: string;
  /** The raw, unparsed request body. */
  rawBody: string;
}

/**
 * Constant-time comparison of two UTF-8 strings that never throws on a length
 * mismatch (which `timingSafeEqual` would).
 */
function safeStringEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf-8");
  const bufferB = Buffer.from(b, "utf-8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Pull the `Signature` out of a Vipps `Authorization` header of the form
 * `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>`.
 */
function parseAuthorizationSignature(authorization: string): string | null {
  if (!authorization.startsWith("HMAC-SHA256 ")) return null;
  const match = /Signature=([^&\s]+)/.exec(authorization);
  return match?.[1] ?? null;
}

/**
 * Verify a webhook request against the shared secret.
 *
 * @returns `true` when the request is authentically from Vipps.
 */
export function verifyVippsWebhookSignature(
  parts: VippsWebhookRequestParts,
  secret: string,
): boolean {
  const providedSignature = parseAuthorizationSignature(parts.authorization);
  if (!providedSignature || !parts.contentSha256 || !parts.date) return false;

  // The body must not have been tampered with: base64(sha256(rawBody)) has to
  // match the x-ms-content-sha256 header.
  const computedContentHash = createHash("sha256")
    .update(parts.rawBody, "utf-8")
    .digest("base64");

  if (!safeStringEqual(computedContentHash, parts.contentSha256)) return false;

  // Rebuild the string Vipps signed and recompute the signature.
  const stringToSign = `${parts.method}\n${parts.pathAndQuery}\n${parts.date};${parts.host};${computedContentHash}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(stringToSign, "utf-8")
    .digest("base64");

  return safeStringEqual(expectedSignature, providedSignature);
}

/** Read the parts we need to verify out of a Fetch API `Request`. */
export function webhookPartsFromRequest(
  request: Request,
  rawBody: string,
): VippsWebhookRequestParts {
  const url = new URL(request.url);
  const header = (name: string) => request.headers.get(name) ?? "";

  return {
    method: request.method,
    pathAndQuery: url.pathname + url.search,
    host: header("host") || url.host,
    date: header("x-ms-date") || header("date"),
    contentSha256: header("x-ms-content-sha256"),
    authorization: header("authorization"),
    rawBody,
  };
}
