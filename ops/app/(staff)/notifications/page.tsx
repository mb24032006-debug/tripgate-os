import { prisma } from "@/lib/db";
import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";
import { describeNotification } from "@/lib/notifications";
import { computeTripFlags } from "@/lib/pipeline";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import SubmitButton from "../SubmitButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const locale = await getLocale();

  const [notifications, openTrips] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.trip.findMany({
      where: { archivedAt: null, overallStatus: { notIn: ["lost", "completed", "cancelled"] } },
      include: {
        customer: true,
        quotes: { select: { status: true, validUntil: true } },
        bookings: { select: { status: true } },
        supportTickets: { select: { status: true, priority: true } },
      },
    }),
  ]);

  const now = new Date();
  // Live, not stored — see lib/notifications.ts's comment on why "needs follow-up" is a rollup,
  // not an event.
  const needsFollowUp = openTrips.filter((trip) => computeTripFlags(trip, now).needsFollowUp);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "notificationsTitle")}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{t(locale, "notificationsPageSubtitle")}</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "markAllReadButton")}</SubmitButton>
          </form>
        )}
      </div>

      {needsFollowUp.length > 0 && (
        <div className="card pad fade-in" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 6, fontSize: "1rem" }}>
            {t(locale, "needsFollowUpFeedHeading")}{" "}
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.78rem" }}>({needsFollowUp.length})</span>
          </h3>
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 10 }}>{t(locale, "needsFollowUpHint")}</p>
          {needsFollowUp.map((trip) => (
            <div key={trip.id} style={{ padding: "4px 0" }}>
              <Link href={`/trips/${trip.id}`} style={{ textDecoration: "underline" }}>
                {trip.customer.name}{trip.reference ? ` — ${trip.reference}` : ""}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {notifications.length === 0 ? (
          <div className="pad muted">{t(locale, "noNotificationsYet")}</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="notif-list-row">
              <span className="notif-dot" style={{ visibility: n.isRead ? "hidden" : "visible" }} />
              <Link href={n.link} className="notif-list-link" style={{ fontWeight: n.isRead ? 400 : 600 }}>
                {describeNotification(locale, n)}
              </Link>
              <span className="muted" style={{ fontSize: "0.75rem", marginLeft: "auto", whiteSpace: "nowrap" }}>
                {n.createdAt.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
              </span>
              {!n.isRead && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" className="btn" style={{ fontSize: "0.7rem" }}>{t(locale, "markReadButton")}</button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
