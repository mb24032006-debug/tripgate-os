// Trip.overallStatus only covers active/on_hold/lost/completed/cancelled — deliberately, per
// schema.prisma's own comment: a stored "current pipeline stage" column would create false "stuck"
// states once Documents/Payments/Support start running concurrently with a Booking. This computes
// a display-only stage as a rollup over the child records instead, so the schema decision stands
// and staff still get the "where is this trip right now" answer the trip list needs.
// Every returned key already exists in lib/i18n.ts's STATUS_LABELS, so callers just do
// statusLabel(locale, computeTripStage(trip)) — no separate translation table to keep in sync.
type StageInput = {
  overallStatus: string;
  requirement?: unknown;
  quotes: { status: string }[];
  bookings: { status: string }[];
};

export function computeTripStage(trip: StageInput): string {
  if (["lost", "completed", "cancelled", "on_hold"].includes(trip.overallStatus)) {
    return trip.overallStatus;
  }
  if (trip.bookings.some((b) => b.status === "confirmed")) return "confirmed";
  if (trip.bookings.length > 0) return "confirmed";
  if (trip.quotes.some((q) => q.status === "accepted")) return "confirmed";
  if (trip.quotes.some((q) => q.status === "sent")) return "awaiting_reply";
  if (trip.quotes.length > 0) return "quoted";
  if (trip.requirement) return "qualifying";
  return "new";
}

// Answers the questions an ops manager actually has with 80 active trips and no time to open each
// one: who's waiting on a reply, what's gone quiet, what's unconfirmed, what's about to expire,
// what's stuck. Computed in the app layer over fields that already exist — none of this needed a
// schema change. Deliberately does NOT attempt "who hasn't paid": Payment rows are never written
// yet (see architecture/03_KNOWN_ARCHITECTURAL_LIMITATIONS.md), so that answer would be a guess
// dressed up as data; better to leave it visibly unanswered than silently wrong.
type FlagsInput = {
  overallStatus: string;
  updatedAt: Date;
  quotes: { status: string; validUntil: Date | null }[];
  bookings: { status: string }[];
  supportTickets: { status: string; priority: string }[];
  // Optional so existing callers that don't select payments (e.g. the notifications page's
  // needs-follow-up scan) keep compiling unchanged — they just don't get paymentOverdue, same as
  // never having selected it at all.
  payments?: { direction: string; dueDate: Date | null; paidDate: Date | null }[];
};

export function computeTripFlags(trip: FlagsInput, now: Date) {
  const daysSinceActivity = Math.floor((now.getTime() - trip.updatedAt.getTime()) / 86_400_000);
  const isTerminal = ["lost", "completed", "cancelled"].includes(trip.overallStatus);
  const sevenDaysMs = 7 * 86_400_000;

  const awaitingReply = trip.quotes.some((q) => q.status === "sent");
  const inactive7d = !isTerminal && daysSinceActivity >= 7;
  const bookingUnconfirmed = trip.bookings.some((b) => b.status !== "confirmed");
  const quoteExpired = trip.quotes.some((q) => q.status === "sent" && q.validUntil != null && q.validUntil.getTime() < now.getTime());
  const quoteExpiringSoon =
    !quoteExpired &&
    trip.quotes.some(
      (q) => q.status === "sent" && q.validUntil != null && q.validUntil.getTime() - now.getTime() <= sevenDaysMs
    );
  const openUrgentTicket = trip.supportTickets.some(
    (t) => !["resolved", "closed"].includes(t.status) && (t.priority === "urgent" || t.priority === "high")
  );
  // "Blocked" = something needs a human decision before this trip can move, not just "old."
  const blocked = !isTerminal && (trip.overallStatus === "on_hold" || quoteExpired || openUrgentTicket);

  // A rejected quote used to leave the trip stage reading "quoted" — implying a live offer awaiting
  // reply — while dropping out of every triage filter, since none of them tested for "every quote
  // is dead and nothing replaced it." This is that missing case: no live quote, no booking, no open
  // ticket. Exactly the deal that needs a follow-up call and is currently invisible.
  const hasLiveQuote = trip.quotes.some((q) => ["draft", "sent", "accepted"].includes(q.status));
  const hasBooking = trip.bookings.length > 0;
  const hasOpenTicket = trip.supportTickets.some((t) => !["resolved", "closed"].includes(t.status));
  const needsFollowUp = !isTerminal && trip.quotes.length > 0 && !hasLiveQuote && !hasBooking && !hasOpenTicket;

  // The exact gap the trips list used to name out loud instead of answering ("Payment status
  // isn't tracked yet, so 'who hasn't paid' can't be answered here") — now that Payment rows are
  // actually written, an inbound payment past its due date with no paidDate is a real, computable
  // answer, not a guess.
  const paymentOverdue = (trip.payments ?? []).some(
    (p) => p.direction === "inbound" && p.paidDate == null && p.dueDate != null && p.dueDate.getTime() < now.getTime()
  );

  return {
    daysSinceActivity,
    isTerminal,
    awaitingReply,
    inactive7d,
    bookingUnconfirmed,
    quoteExpired,
    quoteExpiringSoon,
    openUrgentTicket,
    blocked,
    needsFollowUp,
    paymentOverdue,
  };
}

export type TripFlags = ReturnType<typeof computeTripFlags>;
