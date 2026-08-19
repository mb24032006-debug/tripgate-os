"use client";

import { usePathname } from "next/navigation";
import { setLocale } from "./locale-actions";
import type { Locale } from "@/lib/i18n";

export default function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <form action={setLocale} style={{ display: "flex", gap: 4 }}>
      <input type="hidden" name="returnTo" value={pathname} />
      <button
        type="submit"
        name="locale"
        value="en"
        className="btn"
        style={{ padding: "5px 10px", fontWeight: locale === "en" ? 700 : 400, background: locale === "en" ? "var(--color-neutral-100)" : undefined }}
      >
        EN
      </button>
      <button
        type="submit"
        name="locale"
        value="fr"
        className="btn"
        style={{ padding: "5px 10px", fontWeight: locale === "fr" ? 700 : 400, background: locale === "fr" ? "var(--color-neutral-100)" : undefined }}
      >
        FR
      </button>
    </form>
  );
}
