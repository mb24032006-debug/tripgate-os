import { cookies } from "next/headers";

// Deliberately two states, not three — no "follow system" mode. That would mean the server can
// never know what to render on first paint (no media-query access outside the browser), which
// either forces a client-only flash-of-wrong-theme or a hydration mismatch. A staff tool with one
// explicit switch, defaulting to light, is simpler and correct — same reasoning as lib/i18n.ts's
// locale cookie, which doesn't try to detect browser language either.
export type Theme = "light" | "dark";

export const THEME_COOKIE_NAME = "tg_theme";

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  return store.get(THEME_COOKIE_NAME)?.value === "dark" ? "dark" : "light";
}
