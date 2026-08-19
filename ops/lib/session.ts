import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { roleAtLeast, type Role } from "./auth";

export const SESSION_COOKIE_NAME = "tg_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type CurrentStaff = { id: string; name: string; email: string; role: string };

export async function createSessionCookie(staffId: string) {
  const session = await prisma.session.create({
    data: { staffId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, session.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE_NAME);
}

// Wrapped in React's cache() so the layout and a page can both call this within the same request
// without doubling the Session+Staff round trip — a plain per-request memoization, not a new
// caching layer with its own invalidation to reason about.
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { staff: true } });
  // A disabled Staff account's existing sessions stop working the instant status flips — this is
  // the actual revocation mechanism disabling an account is for.
  if (!session || session.expiresAt.getTime() < Date.now() || session.staff.status !== "active") return null;
  return { id: session.staff.id, name: session.staff.name, email: session.staff.email, role: session.staff.role };
});

// The page/layout-level check: no session -> /login; wrong role -> back to the dashboard, not a
// crash screen (being the wrong role for a page isn't an exceptional condition).
export async function requireStaffPage(min: Role = "agent"): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  if (!roleAtLeast(staff.role, min)) redirect("/");
  return staff;
}

// The Server Action-level check — the real authorization boundary. Next.js's own Proxy docs are
// explicit that a page-level redirect is NOT sufficient on its own: a Server Action is just a POST
// to whatever route renders it, invocable independently of whether the page redirected this
// request. Every mutating action must call this itself. Throws, matching how every other
// validation failure in this codebase's actions already surfaces (e.g. "Only a sent quote can be
// accepted.") — not a redirect, since an action has no natural "page" to redirect to.
export async function requireRole(min: Role): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("You must be signed in to do this.");
  if (!roleAtLeast(staff.role, min)) throw new Error("You don't have permission to do this.");
  return staff;
}
