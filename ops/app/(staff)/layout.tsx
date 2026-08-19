import { getSettings } from "@/lib/settings";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/db";
import { describeNotification } from "@/lib/notifications";
import { requireStaffPage } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import { logout } from "../login/actions";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeToggle from "./ThemeToggle";
import NavLinks from "./NavLinks";
import NotificationBell from "./NotificationBell";
import { SearchIcon } from "./icons";

// The staff app shell (sidebar, topbar search, locale switcher, mobile nav toggle) — everything
// under this route group inherits it; app/quotes/[id]/view (outside the group) does not. Also
// where sign-in is actually enforced for the whole shell: no session -> /login, before anything
// below renders. Individual Server Actions still check their own role requirement independently
// (see lib/session.ts's requireRole comment on why this layout check alone isn't enough).
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage("agent");
  const { operatingModel, enabledModules } = await getSettings();
  const locale = await getLocale();
  const theme = await getTheme();
  const [unreadCount, recentNotifications] = await Promise.all([
    prisma.notification.count({ where: { isRead: false } }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const notificationItems = recentNotifications.map((n) => ({
    id: n.id,
    message: describeNotification(locale, n),
    link: n.link,
    isRead: n.isRead,
  }));

  const navItems = [
    { href: "/", label: t(locale, "dashboard"), show: true },
    // The customer is the centre of the model, not the trip — one person, many trips down the
    // years. Placed ahead of Trips for that reason; both are foundational, never gated behind a
    // module flag, the same way Products/Providers are foundational rather than a "feature" to unlock.
    { href: "/customers", label: t(locale, "customers"), show: true },
    { href: "/trips", label: t(locale, "trips"), show: true },
    { href: "/leads", label: t(locale, "leadInbox"), show: enabledModules.leads },
    { href: "/quotes", label: t(locale, "quoteBuilder"), show: enabledModules.quotes },
    { href: "/products", label: t(locale, "products"), show: true },
    { href: "/providers", label: t(locale, "providers"), show: true },
    { href: "/bookings", label: t(locale, "bookings"), show: enabledModules.bookings },
    { href: "/documents", label: t(locale, "documents"), show: enabledModules.documents },
    // "View payments" / "View tickets" are Manager+ capabilities per the founder's role spec —
    // Agents still record a payment or resolve a ticket from within a trip they're working
    // (that's "respond to clients," an Agent baseline), but the cross-agency ledger/queue views
    // are oversight, not casework.
    { href: "/payments", label: t(locale, "payments"), show: enabledModules.payments && roleAtLeast(staff.role, "manager") },
    { href: "/support", label: t(locale, "support"), show: enabledModules.support && roleAtLeast(staff.role, "manager") },
    { href: "/knowledge", label: t(locale, "knowledgeBase"), show: enabledModules.knowledgeBase },
    { href: "/archive", label: t(locale, "archiveNav"), show: true },
    { href: "/staff", label: t(locale, "staffNav"), show: roleAtLeast(staff.role, "administrator") },
    { href: "/settings", label: t(locale, "settingsNav"), show: true },
  ];

  // Reference, not data — always visible, never gated by a module flag, kept visually separate
  // from the pipeline pages below.
  const helpItem = { href: "/help", label: t(locale, "needHelp") };

  return (
    <>
      {/* CSS-only mobile nav toggle — see globals.css's `#nav-toggle:checked ~ .app-shell` rule.
          Must be a sibling of .app-shell, not nested inside it, for that selector to work. */}
      <input type="checkbox" id="nav-toggle" style={{ display: "none" }} />
      <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          className="sidebar"
          style={{
            width: "var(--sidebar-width)",
            flex: "0 0 var(--sidebar-width)",
            background: "var(--color-primary-blue-deep)",
            color: "#fff",
            padding: "20px 0",
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "0 20px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            {/* The real brand mark, cropped to just the icon glyph — the pre-baked lockup's
                wordmark is navy ink, which disappears against this same navy background; the
                icon's own lettering sits on its opaque gold fill, so it stays legible regardless
                of what's behind it. */}
            <img src="/brand/tripgate-icon.png" alt="" style={{ height: 36, width: "auto", flexShrink: 0 }} />
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.2rem", fontWeight: 700 }}>
              TripGate <span style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-gold)", fontFamily: "var(--font-inter)" }}>Orchestration OS</span>
            </div>
          </div>
          <NavLinks items={navItems.filter((n) => n.show)} helpItem={helpItem} />
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="topbar-row"
            style={{
              minHeight: 54,
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 24px",
              background: "var(--surface)",
            }}
          >
            <label htmlFor="nav-toggle" className="nav-toggle-label" aria-label={t(locale, "menuLabel")}>☰</label>
            <form action="/search" className="search-box">
              <SearchIcon size={15} />
              <input type="text" name="q" placeholder={t(locale, "searchPlaceholder")} />
            </form>
            <span
              style={{
                background: "var(--color-neutral-100)",
                border: "1px solid var(--color-neutral-200)",
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--heading)",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
              }}
            >
              {t(locale, "operatingModel")}: {operatingModel}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <NotificationBell
                unreadCount={unreadCount}
                items={notificationItems}
                labels={{
                  title: t(locale, "notificationsTitle"),
                  empty: t(locale, "notificationsEmpty"),
                  markAllRead: t(locale, "markAllReadButton"),
                  viewAll: t(locale, "viewAllNotificationsLink"),
                }}
              />
              <ThemeToggle theme={theme} label={t(locale, theme === "dark" ? "themeToggleToLight" : "themeToggleToDark")} />
              <LocaleSwitcher locale={locale} />
              <span className="muted" style={{ fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                {statusLabel(locale, staff.role)}
              </span>
              <form action={logout}>
                <button type="submit" className="btn" style={{ fontSize: "0.76rem" }}>{t(locale, "logoutButton")}</button>
              </form>
            </div>
          </div>
          <main style={{ padding: 24 }}>{children}</main>
        </div>
      </div>
    </>
  );
}
