"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markAllNotificationsRead } from "./notifications/actions";
import { BellIcon } from "./icons";

type NotificationItem = { id: string; message: string; link: string; isRead: boolean };

// The missing "slot" the Operational Inspection flagged: a persistent entry point in the top bar.
// Deliberately the only dropdown/popover in this app — everywhere else is server-rendered pages —
// so its open/close state has to live in a client component; the badge count and row content are
// still computed server-side (StaffLayout) and passed in as plain props, same as every other client
// island here (ThemeToggle, LocaleSwitcher).
export default function NotificationBell({
  unreadCount,
  items,
  labels,
}: {
  unreadCount: number;
  items: NotificationItem[];
  labels: { title: string; empty: string; markAllRead: string; viewAll: string };
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="icon-btn"
        aria-label={labels.title}
        title={labels.title}
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <BellIcon size={17} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>{labels.title}</span>
            {unreadCount > 0 && (
              <form action={markAllNotificationsRead}>
                <button type="submit" className="notif-mark-all">{labels.markAllRead}</button>
              </form>
            )}
          </div>
          <div className="notif-panel-list">
            {items.length === 0 ? (
              <div className="notif-empty muted">{labels.empty}</div>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  className="notif-row"
                  onClick={() => setOpen(false)}
                >
                  <span className="notif-dot" style={{ visibility: n.isRead ? "hidden" : "visible" }} />
                  <span className="notif-text" style={{ fontWeight: n.isRead ? 400 : 600 }}>{n.message}</span>
                </Link>
              ))
            )}
          </div>
          <Link href="/notifications" className="notif-view-all" onClick={() => setOpen(false)}>
            {labels.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
