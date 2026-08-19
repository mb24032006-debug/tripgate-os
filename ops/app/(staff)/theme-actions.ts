"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { THEME_COOKIE_NAME } from "@/lib/theme";

export async function setTheme(formData: FormData) {
  const theme = String(formData.get("theme") ?? "light");
  const returnTo = String(formData.get("returnTo") ?? "/");
  const store = await cookies();
  store.set(THEME_COOKIE_NAME, theme === "dark" ? "dark" : "light", { path: "/" });
  redirect(returnTo);
}
