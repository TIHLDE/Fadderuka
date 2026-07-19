import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Local password hashing, used only as a bridge for self-registered users whose
 * TIHLDE account is still pending admin approval on tihlde.org. Those accounts
 * cannot authenticate against Lepton yet (`POST /auth/login/` returns 401), so
 * we keep a hash of the password they chose during registration and accept it
 * here until TIHLDE takes over. The hash is dropped the first time a real
 * TIHLDE login succeeds — see `src/app/api/auth/login/route.ts`.
 *
 * scrypt from node:crypto keeps this dependency-free; parameters follow the
 * OWASP minimum (N=2^16, r=8, p=1).
 */

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 65536, r: 8, p: 1, maxmem: 128 * 65536 * 8 * 2 };

/** Promise wrapper around node's callback-style scrypt. */
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/**
 * Alphabet without the characters that get misread when a password is passed on
 * verbally or on paper (0/O, 1/l/I).
 */
const TEMP_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const TEMP_LENGTH = 12;

/**
 * A single-use password an admin hands to a student whose TIHLDE account is
 * still pending. Rejection sampling keeps the distribution uniform (256 is not
 * a multiple of the alphabet length, so plain modulo would bias the first
 * characters).
 */
export function generateTempPassword(): string {
  const limit = 256 - (256 % TEMP_ALPHABET.length);
  let out = "";
  while (out.length < TEMP_LENGTH) {
    for (const byte of randomBytes(TEMP_LENGTH)) {
      if (byte >= limit) continue;
      out += TEMP_ALPHABET[byte % TEMP_ALPHABET.length];
      if (out.length === TEMP_LENGTH) break;
    }
  }
  return out;
}

/** Hash a plaintext password into a self-describing `scrypt:salt:hash` string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derive(password, salt);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Constant-time check of a plaintext password against a stored hash. */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(derived, expected);
}
