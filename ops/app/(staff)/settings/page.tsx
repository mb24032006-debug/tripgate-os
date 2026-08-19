import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { roleAtLeast } from "@/lib/auth";
import { getSettings, type EnabledModules } from "@/lib/settings";
import { getLocale, t, type StringKey } from "@/lib/i18n";
import { updateMyAccount, changeMyPassword, updateModules, addExchangeRate, deleteExchangeRate } from "./actions";
import SubmitButton from "../SubmitButton";
import ConfirmSubmitButton from "../ConfirmSubmitButton";

export const dynamic = "force-dynamic";

const MODULE_LABEL_KEYS: Record<keyof EnabledModules, StringKey> = {
  leads: "leadInbox",
  quotes: "quoteBuilder",
  support: "support",
  bookings: "bookings",
  documents: "documents",
  payments: "payments",
  knowledgeBase: "knowledgeBase",
  availability: "moduleAvailabilityLabel",
  customerPortal: "moduleCustomerPortalLabel",
};

// These three have no page or feature behind them at all yet (unlike knowledgeBase, which has a
// real, if empty, page) — an audit against the actual routes found each one 404ing. Letting an
// Administrator "enable" one from here would be exactly the trap this app's own doctrine keeps
// finding and fixing elsewhere: a control that promises a room that isn't built. Disabled (and
// force-unchecked, since a disabled checkbox is simply omitted from FormData — updateModules
// already treats an absent key as "off") until each one has a real feature to gate.
const NOT_YET_BUILT: Set<keyof EnabledModules> = new Set(["documents", "availability", "customerPortal"]);

const OPERATING_MODELS = ["intermediary", "network", "tour_operator", "hybrid"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pwError?: string; pwSuccess?: string }>;
}) {
  const staff = await requireStaffPage("agent");
  const locale = await getLocale();
  const isAdmin = roleAtLeast(staff.role, "administrator");
  const { pwError, pwSuccess } = await searchParams;

  const [{ operatingModel, enabledModules }, rates] = await Promise.all([
    getSettings(),
    isAdmin ? prisma.exchangeRate.findMany({ orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }] }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "settingsPageTitle")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "settingsPageSubtitle")}</p>
      </div>

      <div className="card pad fade-in" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "myAccountHeading")}</h3>
        <form action={updateMyAccount} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "myAccountNameLabel")}</div>
            <input type="text" name="name" defaultValue={staff.name} required />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "myAccountEmailLabel")}</div>
            <input type="email" name="email" defaultValue={staff.email} required />
          </label>
          <SubmitButton className="btn btn-primary" pendingLabel={t(locale, "savingButton")}>{t(locale, "saveAccountButton")}</SubmitButton>
        </form>
      </div>

      <div className="card pad fade-in" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "changePasswordHeading")}</h3>
        {pwError && (
          <p style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 12 }}>
            {t(locale, pwError === "short" ? "newPasswordTooShortError" : "wrongCurrentPasswordError")}
          </p>
        )}
        {pwSuccess && (
          <p style={{ background: "var(--color-green-soft)", color: "var(--color-green)", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 12 }}>
            {t(locale, "passwordChangedNote")}
          </p>
        )}
        <form action={changeMyPassword} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "currentPasswordLabel")}</div>
            <input type="password" name="currentPassword" required />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted">{t(locale, "newPasswordLabel")}</div>
            <input type="password" name="newPassword" required minLength={8} />
          </label>
          <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "changePasswordButton")}</SubmitButton>
        </form>
      </div>

      {isAdmin && (
        <>
          <div className="card pad fade-in" style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 6, fontSize: "1rem" }}>{t(locale, "moduleTogglesHeading")}</h3>
            <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 12 }}>{t(locale, "moduleTogglesHint")}</p>
            <form action={updateModules}>
              <label style={{ fontSize: "0.8rem", display: "block", marginBottom: 12 }}>
                <div className="muted">{t(locale, "operatingModelLabel")}</div>
                <select name="operatingModel" defaultValue={operatingModel}>
                  {OPERATING_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                {(Object.keys(MODULE_LABEL_KEYS) as (keyof EnabledModules)[]).map((key) => {
                  const notYetBuilt = NOT_YET_BUILT.has(key);
                  return (
                    <label
                      key={key}
                      style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6, opacity: notYetBuilt ? 0.6 : 1 }}
                    >
                      <input type="checkbox" name={key} defaultChecked={!notYetBuilt && enabledModules[key]} disabled={notYetBuilt} />
                      {t(locale, MODULE_LABEL_KEYS[key])}
                      {notYetBuilt && <span className="muted" style={{ fontSize: "0.72rem" }}>({t(locale, "notYetBuiltLabel")})</span>}
                    </label>
                  );
                })}
              </div>
              <SubmitButton className="btn btn-primary" pendingLabel={t(locale, "savingButton")}>{t(locale, "saveModulesButton")}</SubmitButton>
            </form>
          </div>

          <div className="card pad fade-in">
            <h3 style={{ marginBottom: 6, fontSize: "1rem" }}>{t(locale, "exchangeRatesHeading")}</h3>
            <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 12 }}>{t(locale, "exchangeRatesHint")}</p>
            <form action={addExchangeRate} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "fromCurrencyLabel")}</div>
                <input type="text" name="fromCurrency" placeholder="USD" style={{ width: 70 }} required maxLength={3} />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "toCurrencyLabel")}</div>
                <input type="text" name="toCurrency" placeholder="MAD" style={{ width: 70 }} required maxLength={3} />
              </label>
              <label style={{ fontSize: "0.8rem" }}>
                <div className="muted">{t(locale, "rateLabel")}</div>
                <input type="number" name="rate" step="0.0001" min="0" style={{ width: 100 }} required />
              </label>
              <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "addRateButton")}</SubmitButton>
            </form>
            {rates.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.82rem" }}>{t(locale, "noRatesYet")}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t(locale, "fromCurrencyLabel")}</th>
                    <th>{t(locale, "toCurrencyLabel")}</th>
                    <th>{t(locale, "rateLabel")}</th>
                    <th>{t(locale, "colUpdated")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.fromCurrency}</td>
                      <td className="muted">{r.toCurrency}</td>
                      <td>{r.rate}</td>
                      <td className="muted">{r.updatedAt.toLocaleDateString()}</td>
                      <td>
                        <form action={deleteExchangeRate}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn" type="submit">{t(locale, "removeButton")}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
