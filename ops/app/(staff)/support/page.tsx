import { prisma } from "@/lib/db";
import Link from "next/link";
import { resolveSupportTicket } from "./actions";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { requireStaffPage } from "@/lib/session";

export const dynamic = "force-dynamic";

// Manager+ only ("view tickets" in the founder's role spec) — an Agent still resolves tickets on
// trips they're working from the trip detail page itself; this cross-agency queue is oversight.
export default async function SupportPage() {
  await requireStaffPage("manager");
  const locale = await getLocale();
  const tickets = await prisma.supportTicket.findMany({
    include: { trip: { include: { customer: true } } },
    orderBy: { openedAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "support")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "supportSubtitle")}</p>
      </div>
      <div className="card">
        {tickets.length === 0 ? (
          <div className="pad muted">{t(locale, "noTicketsYet")}</div>
        ) : (
          <table>
            <thead><tr><th>{t(locale, "colTrip")}</th><th>{t(locale, "colSubject")}</th><th>{t(locale, "colPriority")}</th><th>{t(locale, "colStatus")}</th><th>{t(locale, "colOpened")}</th><th></th></tr></thead>
            <tbody>
              {tickets.map((ti) => (
                <tr key={ti.id}>
                  <td>
                    <Link href={`/trips/${ti.tripId}`} style={{ fontWeight: 600, textDecoration: "underline" }}>
                      {ti.trip.customer.name}
                    </Link>
                  </td>
                  <td>{ti.subject}</td>
                  <td className="muted">{statusLabel(locale, ti.priority)}</td>
                  <td className="muted">{statusLabel(locale, ti.status)}</td>
                  <td className="muted">{ti.openedAt.toLocaleDateString()}</td>
                  <td>
                    {ti.status !== "resolved" && (
                      <form action={resolveSupportTicket}>
                        <input type="hidden" name="ticketId" value={ti.id} />
                        <input type="hidden" name="tripId" value={ti.tripId} />
                        <button className="btn" type="submit">{t(locale, "markResolvedButton")}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
