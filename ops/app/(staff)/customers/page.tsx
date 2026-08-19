import { prisma } from "@/lib/db";
import Link from "next/link";
import { getLocale, t } from "@/lib/i18n";
import { archiveCustomer } from "./actions";
import ConfirmSubmitButton from "../ConfirmSubmitButton";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const locale = await getLocale();
  const customers = await prisma.customer.findMany({
    where: { archivedAt: null },
    include: { _count: { select: { trips: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "customers")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "customersSubtitle")}</p>
      </div>
      <div className="card">
        {customers.length === 0 ? (
          <div className="pad muted">{t(locale, "noCustomersYet")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colCustomer")}</th>
                <th>{t(locale, "customerEmailLabel")}</th>
                <th>{t(locale, "phoneLabel")}</th>
                <th>{t(locale, "trips")}</th>
                <th>{t(locale, "customerSinceLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="muted">{c.email ?? "—"}</td>
                  <td className="muted">{c.phone ?? "—"}</td>
                  <td className="muted">{c._count.trips}</td>
                  <td className="muted">{c.createdAt.getFullYear()}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/customers/${c.id}`} className="btn">{t(locale, "openButton")}</Link>
                    <form action={archiveCustomer}>
                      <input type="hidden" name="customerId" value={c.id} />
                      <ConfirmSubmitButton className="btn" confirmMessage={t(locale, "archiveCustomerConfirm")}>
                        {t(locale, "archiveCustomerButton")}
                      </ConfirmSubmitButton>
                    </form>
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
