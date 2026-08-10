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

/**
 * Stands in for a hash nobody knows, marking an account that must set a new
 * password before it can be used.
 *
 * The OAuth cutover dropped the `passwordHash` column from production, which
 * destroyed the only credential 130 self-registered students had — 113 of whom
 * had already paid. The hashes are gone for good: Neon's history window is six
 * hours and the migration ran eight hours before the earliest restorable point.
 *
 * Writing this value restores the one fact that matters, that these accounts
 * have a local password, without pretending to know what it was. It is not a
 * valid `scrypt:` string, so `verifyPassword` can never accept it; but it is
 * non-null, so `glemt-passord` will send them a reset link. Storing a random
 * hash instead would do the same job while being unreadable to whoever opens
 * the table next.
 */
export const RESET_REQUIRED = "reset-required";

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
