"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionCookie, destroySessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";

// Redirects with an error flag instead of throwing — a thrown error here would hit the generic
// app/error.tsx boundary ("Something went wrong"), which is the right call for an unexpected bug
// but wrong for "you typed the wrong password," a routine, expected outcome that deserves its own
// plain-language message on the login page itself, not a crash screen.
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const staff = await prisma.staff.findUnique({ where: { email } });
  // Same failure path whether the email doesn't exist or the password is wrong — confirming which
  // one it was hands a real attacker a working email address for free.
  if (!staff || staff.status !== "active" || !verifyPassword(password, staff.passwordHash)) {
    redirect("/login?error=1");
  }

  await createSessionCookie(staff.id);
  redirect("/");
}

export async function logout() {
  await destroySessionCookie();
  redirect("/login");
}
