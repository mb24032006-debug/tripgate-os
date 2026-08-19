import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { ROLES } from "@/lib/auth";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { createStaff, setStaffStatus } from "./actions";
import SubmitButton from "../SubmitButton";
import ConfirmSubmitButton from "../ConfirmSubmitButton";

export const dynamic = "force-dynamic";

// Administrator-only — "Add employees" from the founder's own role spec. Disabling (never
// deleting) an account is the one destructive-ish action here, so it gets the same confirm-prompt
// treatment as deleting a trip.
export default async function StaffPage() {
  const currentStaff = await requireStaffPage("administrator");
  const locale = await getLocale();
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "staffPageTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "staffPageSubtitle")}</p>
      </div>

      <div className="card pad fade-in" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "newStaffHeading")}</h3>
        <form action={createStaff} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "colName")}</div>
            <input type="text" name="name" required />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "colEmail")}</div>
            <input type="email" name="email" required />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "newStaffPasswordLabel")}</div>
            <input type="password" name="password" required minLength={8} />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "colRole")}</div>
            <select name="role" defaultValue="agent">
              {ROLES.map((r) => (
                <option key={r} value={r}>{statusLabel(locale, r)}</option>
              ))}
            </select>
          </label>
          <SubmitButton className="btn btn-primary" pendingLabel={t(locale, "savingButton")}>{t(locale, "addStaffButton")}</SubmitButton>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{t(locale, "colName")}</th>
              <th>{t(locale, "colEmail")}</th>
              <th>{t(locale, "colRole")}</th>
              <th>{t(locale, "colStatus")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}{s.id === currentStaff.id && <span className="muted" style={{ fontWeight: 400 }}> (you)</span>}</td>
                <td className="muted">{s.email}</td>
                <td className="muted">{statusLabel(locale, s.role)}</td>
                <td className="muted">
                  {s.status === "disabled" ? (
                    <span className="badge danger">{t(locale, "staffDisabledNote")}</span>
                  ) : (
                    <span className="badge success">{statusLabel(locale, "active")}</span>
                  )}
                </td>
                <td>
                  {s.id !== currentStaff.id && (
                    <form action={setStaffStatus}>
                      <input type="hidden" name="staffId" value={s.id} />
                      <input type="hidden" name="status" value={s.status === "disabled" ? "active" : "disabled"} />
                      {s.status === "disabled" ? (
                        <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "enableStaffButton")}</SubmitButton>
                      ) : (
                        <ConfirmSubmitButton className="btn btn-danger" confirmMessage={`${t(locale, "disableStaffButton")} ${s.name}?`}>
                          {t(locale, "disableStaffButton")}
                        </ConfirmSubmitButton>
                      )}
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
