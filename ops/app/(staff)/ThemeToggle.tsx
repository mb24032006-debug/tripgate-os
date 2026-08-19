"use client";

import { usePathname } from "next/navigation";
import { setTheme } from "./theme-actions";
import { SunIcon, MoonIcon } from "./icons";
import type { Theme } from "@/lib/theme";

export default function ThemeToggle({ theme, label }: { theme: Theme; label: string }) {
  const pathname = usePathname();
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <form action={setTheme}>
      <input type="hidden" name="returnTo" value={pathname} />
      <input type="hidden" name="theme" value={next} />
      <button type="submit" className="icon-btn" aria-label={label} title={label}>
        {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </button>
    </form>
  );
}
