import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatMinor } from "@/lib/money";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { requireStaffPage } from "@/lib/session";
import { markPaymentPaid } from "./actions";
import SubmitButton from "../SubmitButton";

export const dynamic = "force-dynamic";

// One ledger across every trip, direction, and type — same discipline as Bookings/Products: the
// list is flat and filterable by eye, not split into separate screens per payment type. Manager+
// only ("view payments" in the founder's role spec) — checked here too, not just via the hidden
// nav link, so navigating straight to the URL doesn't bypass it.
export default async function PaymentsPage() {
  await requireStaffPage("manager");
  const locale = await getLocale();
  const now = new Date();
  const payments = await prisma.payment.findMany({
    include: { trip: { include: { customer: true } } },
    orderBy: [{ paidDate: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "payments")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "paymentsSubtitle")}</p>
      </div>
      <div className="card">
        {payments.length === 0 ? (
          <div className="pad muted">{t(locale, "noPaymentsYet")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "colDirection")}</th>
                <th>{t(locale, "paymentTypeLabel")}</th>
                <th>{t(locale, "colAmount")}</th>
                <th>{t(locale, "colDueDate")}</th>
                <th>{t(locale, "colStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const overdue = p.direction === "inbound" && !p.paidDate && p.dueDate != null && p.dueDate.getTime() < now.getTime();
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/trips/${p.tripId}`} style={{ textDecoration: "underline" }}>{p.trip.customer.name}</Link>
                      {p.trip.reference && <span className="muted" style={{ fontWeight: 400 }}> · {p.trip.reference}</span>}
                    </td>
                    <td className="muted">{statusLabel(locale, p.direction)}</td>
                    <td className="muted">{statusLabel(locale, p.type)}</td>
                    <td>{formatMinor(p.amountMinor, p.currency)}</td>
                    <td className="muted">{p.dueDate ? p.dueDate.toLocaleDateString() : "—"}</td>
                    <td>
                      {p.paidDate ? (
                        <span className="badge success">{t(locale, "paymentPaidLabel")} · {p.paidDate.toLocaleDateString()}</span>
                      ) : overdue ? (
                        <span className="badge danger">{t(locale, "paymentOverdueLabel")}</span>
                      ) : (
                        <span className="badge warn">{t(locale, "paymentDueLabel")}</span>
                      )}
                    </td>
                    <td>
                      {!p.paidDate && (
                        <form action={markPaymentPaid}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="tripId" value={p.tripId} />
                          <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "markPaidButton")}</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
