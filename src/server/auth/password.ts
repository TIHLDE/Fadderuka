import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Local password hashing, used only as a bridge for students who registered
 * here without an @stud.ntnu.no address.
 *
 * Photon will not let them sign in until they have clicked the verification
 * mail, and their TIHLDE membership is not activated until an admin or a Feide
 * login does it. Without a local password they could register and pay, then be
 * locked out of the app they just paid for. So we keep a hash of the password
 * they chose during registration and accept it here until TIHLDE takes over.
 * The hash is dropped the first time a real TIHLDE login succeeds — see
 * `src/app/api/auth/callback/route.ts`.
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
