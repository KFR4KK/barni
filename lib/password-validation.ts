// Split out from lib/password.ts specifically so it can be imported from
// a Client Component (components/settings/ConnectedAccounts.tsx) for
// instant validation feedback — lib/password.ts itself imports
// `node:crypto` (for hashPassword/verifyPassword), which breaks a client
// bundle if pulled in even indirectly. This file has no such import, so
// it's safe on both sides.

export const MIN_PASSWORD_LENGTH = 8;

// Deliberately simple (length only, no forced character-class rules):
// those rules are well-documented as pushing users toward predictable
// substitutions (NIST SP 800-63B recommends against them) without
// meaningfully raising real entropy.
export function isPasswordValid(plainPassword: string): boolean {
  return plainPassword.length >= MIN_PASSWORD_LENGTH;
}
