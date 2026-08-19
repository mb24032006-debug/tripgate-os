import Link from "next/link";
import { getLocale, localized, t } from "@/lib/i18n";
import { PIPELINE_STEPS, FAQ } from "@/lib/helpContent";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const locale = await getLocale();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "needHelp")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "helpPageSubtitle")}</p>
      </div>

      <div className="card pad" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>{t(locale, "howItWorksHeading")}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 4 }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 168,
                  minHeight: 108,
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: step.href ? "var(--surface)" : "var(--color-neutral-100)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>
                    {localized(locale, step.titleEn, step.titleFr)}
                  </div>
                  <div className="muted" style={{ fontSize: "0.72rem", lineHeight: 1.4 }}>
                    {localized(locale, step.whereEn, step.whereFr)}
                  </div>
                </div>
                {step.href && (
                  <Link href={step.href} style={{ fontSize: "0.72rem", textDecoration: "underline", marginTop: 6 }}>
                    {t(locale, "openButton")}
                  </Link>
                )}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="muted" style={{ fontSize: "1rem" }} aria-hidden="true">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>{t(locale, "faqHeading")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((entry, i) => (
            <details key={i} style={{ borderBottom: i < FAQ.length - 1 ? "1px solid var(--color-border)" : undefined, paddingBottom: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                {localized(locale, entry.qEn, entry.qFr)}
              </summary>
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: 8, lineHeight: 1.6 }}>
                {localized(locale, entry.aEn, entry.aFr)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
