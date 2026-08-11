import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export { isPasswordValid, MIN_PASSWORD_LENGTH } from "@/lib/password-validation";

const scrypt = promisify(scryptCallback);

// Email + password sign-in (Account Linking brief, section 1/11). Uses
// Node's built-in `crypto.scrypt` rather than adding bcrypt/argon2 as a
// dependency — scrypt is a real, still-recommended KDF (OWASP lists it
// alongside Argon2/bcrypt) and this avoids a native-module dependency
// entirely, which matters on Windows dev machines (see this project's
// own history of native-module friction) and keeps the "avoid
// unnecessary dependencies" rule from the landing page brief intact here
// too.
//
// Server-only — imports `node:crypto`, which breaks a Client Component
// bundle. Anything that needs to validate a password's shape from
// client code (e.g. an inline "8+ characters" hint) should import
// isPasswordValid/MIN_PASSWORD_LENGTH from lib/password-validation
// directly instead of through this file — see that file's own comment.
//
// Stored format: "<saltHex>:<hashHex>" in User.passwordHash. Salt is
// regenerated per password (hashPassword), never reused.

const KEY_LENGTH = 64;

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;

  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;

  // timingSafeEqual requires equal-length buffers, and throws instead of
  // returning false if they differ — a mismatched length already means
  // "wrong password" (or a corrupted hash), so that's exactly the false
  // this returns instead of letting the exception bubble up.
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}
