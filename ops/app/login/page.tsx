import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/session";
import { getLocale, t } from "@/lib/i18n";
import { login } from "./actions";
import SubmitButton from "../(staff)/SubmitButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getCurrentStaff();
  if (staff) redirect("/");

  const locale = await getLocale();
  const { error } = await searchParams;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card pad fade-in" style={{ width: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, justifyContent: "center" }}>
          <img src="/brand/tripgate-icon.png" alt="" style={{ height: 40, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.25rem", fontWeight: 700, color: "var(--heading)" }}>
            TripGate
            <span style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-gold)", fontFamily: "var(--font-inter)" }}>
              Orchestration OS
            </span>
          </div>
        </div>
        {error && (
          <p style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 14 }}>
            {t(locale, "loginErrorMessage")}
          </p>
        )}
        <form action={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted" style={{ marginBottom: 4 }}>{t(locale, "loginEmailLabel")}</div>
            <input type="email" name="email" required autoFocus style={{ width: "100%" }} />
          </label>
          <label style={{ fontSize: "0.8rem" }}>
            <div className="muted" style={{ marginBottom: 4 }}>{t(locale, "loginPasswordLabel")}</div>
            <input type="password" name="password" required style={{ width: "100%" }} />
          </label>
          <SubmitButton className="btn btn-primary" pendingLabel={t(locale, "loginSigningInButton")}>
            {t(locale, "loginButton")}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
