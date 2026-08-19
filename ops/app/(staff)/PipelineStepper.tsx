import { PIPELINE_STEPS } from "@/lib/helpContent";
import { localized, statusLabel, t, type Locale } from "@/lib/i18n";
import { CheckIcon } from "./icons";

// A trip's real progress, not a fabricated one: every signal here already exists on the trip
// (a Lead row, a TripRequirement row, quote count, booking status) — nothing is inferred or
// guessed. Deliberately covers only Lead/Requirements/Quote/Booking, the four stages this app can
// actually attest to; Documents and Payments are excluded rather than shown as perpetually
// "pending" (same "honest absence" the Help page already applies to those two). Support is
// orthogonal to a linear sequence — it can open at any stage — so it's not a node here either.
const NODE_KEYS = ["lead", "requirements", "quote", "booking"] as const;
type NodeKey = (typeof NODE_KEYS)[number];

export default function PipelineStepper({
  locale,
  overallStatus,
  hasRequirement,
  quoteCount,
  quoteAwaitingReply,
  bookingStatus,
}: {
  locale: Locale;
  overallStatus: string;
  hasRequirement: boolean;
  quoteCount: number;
  quoteAwaitingReply: boolean;
  bookingStatus: string | null;
}) {
  const done: Record<NodeKey, boolean> = {
    lead: true,
    requirements: hasRequirement,
    quote: quoteCount > 0,
    booking: bookingStatus != null,
  };
  const firstNotDone = NODE_KEYS.find((k) => !done[k]);
  const isTerminal = ["lost", "cancelled", "completed", "on_hold"].includes(overallStatus);
  const terminalBadgeClass =
    overallStatus === "completed" ? "success" : overallStatus === "on_hold" ? "warn" : "danger";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div className="stepper">
        {NODE_KEYS.map((key, i) => {
          const step = PIPELINE_STEPS.find((p) => p.key === key)!;
          const isDone = done[key];
          const isCurrent = key === firstNotDone;
          const isConfirmedBooking = key === "booking" && bookingStatus === "confirmed";

          let dotClass = "stepper-dot";
          if (isConfirmedBooking) dotClass += " confirmed";
          else if (isDone) dotClass += " done";
          else if (isCurrent) dotClass += " current";

          let sublabel: string | null = null;
          if (key === "booking" && bookingStatus) sublabel = statusLabel(locale, bookingStatus);
          else if (key === "quote" && quoteAwaitingReply && !done.booking) sublabel = t(locale, "awaitingReplyItemsLabel");

          return (
            <div key={key} style={{ display: "flex", alignItems: "flex-start" }}>
              <div className="stepper-node">
                <div className={dotClass}>{isDone || isConfirmedBooking ? <CheckIcon size={14} /> : i + 1}</div>
                <div className={`stepper-label${isDone || isCurrent ? " done" : ""}`}>
                  {localized(locale, step.titleEn, step.titleFr)}
                </div>
                {sublabel && <div className="muted" style={{ fontSize: "0.68rem" }}>{sublabel}</div>}
              </div>
              {i < NODE_KEYS.length - 1 && <div className={`stepper-line${isDone ? " done" : ""}`} />}
            </div>
          );
        })}
      </div>
      {isTerminal && <span className={`badge ${terminalBadgeClass}`}>{statusLabel(locale, overallStatus)}</span>}
    </div>
  );
}
