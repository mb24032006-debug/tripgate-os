import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Node's built-in scrypt rather than adding bcrypt/argon2 as a dependency — this codebase already
// leans on the platform instead of a library wherever the platform genuinely covers it (hand-drawn
// icons instead of an icon library, CSS keyframes instead of an animation library). scrypt is a
// legitimate, still-recommended KDF, not a shortcut.
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

// Constant-time comparison — a plain === on the derived hashes would leak how many leading bytes
// matched through timing, defeating the point of hashing the password in the first place.
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const storedBuffer = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  return candidate.length === storedBuffer.length && timingSafeEqual(candidate, storedBuffer);
}

export const ROLES = ["agent", "manager", "administrator"] as const;
export type Role = (typeof ROLES)[number];

// Cumulative on purpose (per the founder's own spec) — a Manager can do everything an Agent can,
// plus more; an Administrator, everything a Manager can, plus more. No independent per-role
// capability sets.
const ROLE_RANK: Record<Role, number> = { agent: 1, manager: 2, administrator: 3 };

export function roleAtLeast(role: string, min: Role): boolean {
  return (ROLE_RANK[role as Role] ?? 0) >= ROLE_RANK[min];
}
