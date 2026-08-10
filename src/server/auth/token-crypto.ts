import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { env } from "~/env";

/**
 * Encryption for the TIHLDE API tokens we hold on behalf of logged-in users.
 *
 * `Session.tihldeToken` is a live credential for someone's TIHLDE account — it
 * can read their profile and write to it (that is how allergy sync works). It
 * outlives our own session row and nothing on tihlde.org invalidates it when
 * the user logs out here, so anyone who reads the sessions table gets durable
 * access to real accounts. Storing it in clear text made a database dump a
 * credential dump.
 *
 * AES-256-GCM, key from `SESSION_ENCRYPTION_KEY`. Ciphertexts are tagged with
 * a version prefix so an unencrypted value written before this existed is still
 * readable, and so the scheme can be rotated later without guesswork.
 *
 * With no key configured we simply do not store the token. That degrades one
 * feature (allergy sync) and never writes a secret we cannot protect — which is
 * the right way round for a value like this.
 */

const SCHEME = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, the GCM standard
const AUTH_TAG_LENGTH = 16;

/** The configured key, or null when encryption is not available. */
function key(): Buffer | null {
  const hex = env.SESSION_ENCRYPTION_KEY;
  if (!hex) return null;
  return Buffer.from(hex, "hex");
}

/** Whether tokens can be stored at all. */
export function canStoreTihldeToken(): boolean {
  return key() !== null;
}

/**
 * Encrypt a TIHLDE token for storage. Returns null when no key is configured,
 * which the caller stores as "no token" rather than as plaintext.
 */
export function encryptToken(plaintext: string | null): string | null {
  if (!plaintext) return null;

  const k = key();
  if (!k) {
    console.warn(
      "[auth] SESSION_ENCRYPTION_KEY is not set — the TIHLDE token will not be stored, so allergy sync is disabled.",
    );
    return null;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, k, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SCHEME,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypt a stored token.
 *
 * A value without our version prefix is one written before encryption existed,
 * and is returned as-is so existing sessions keep working; it is replaced with
 * a ciphertext the next time the user logs in. A value that is tagged but fails
 * to authenticate returns null rather than throwing — a corrupt or
 * wrong-key token should log the user out of TIHLDE-backed features, not crash
 * every request that touches their session.
 */
export function decryptToken(stored: string | null): string | null {
  if (!stored) return null;
  if (!stored.startsWith(`${SCHEME}.`)) return stored;

  const [, ivPart, tagPart, dataPart] = stored.split(".");
  if (!ivPart || !tagPart || !dataPart) return null;

  const k = key();
  if (!k) return null;

  try {
    const authTag = Buffer.from(tagPart, "base64");
    if (authTag.length !== AUTH_TAG_LENGTH) return null;

    const decipher = createDecipheriv(
      ALGORITHM,
      k,
      Buffer.from(ivPart, "base64"),
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext.
    return null;
  }
}
