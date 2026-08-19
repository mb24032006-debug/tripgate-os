"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

// A client component purely so the active link can react to the current path — the rest of the
// staff shell stays server-rendered. Mirrors the same "one small client island" shape as
// LocaleSwitcher/ThemeToggle rather than making the whole layout a client component.
export default function NavLinks({ items, helpItem }: { items: NavItem[]; helpItem: NavItem }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav>
      {items.map((n) => (
        <Link key={n.href} href={n.href} className={`nav-link${isActive(n.href) ? " active" : ""}`}>
          {n.label}
        </Link>
      ))}
      <Link
        href={helpItem.href}
        className={`nav-link${isActive(helpItem.href) ? " active" : ""}`}
        style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.15)" }}
      >
        {helpItem.label}
      </Link>
    </nav>
  );
}
