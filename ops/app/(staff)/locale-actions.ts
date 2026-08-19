"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME } from "@/lib/i18n";

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const returnTo = String(formData.get("returnTo") ?? "/");
  const store = await cookies();
  store.set(COOKIE_NAME, locale === "fr" ? "fr" : "en", { path: "/" });
  // Force a fresh server render of the current page (and the layout around it) rather than
  // relying on the router cache to notice a cookie-only change.
  redirect(returnTo);
}
