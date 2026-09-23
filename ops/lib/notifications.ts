import { prisma } from "./db";
import { t, type Locale, type StringKey } from "./i18n";

// The event types with a real, single-moment trigger in the code today. The Operational
// Inspection catalogued twelve; the still-missing ones aren't wired here on purpose:
// - Document uploaded: that module doesn't exist yet (no producer to call this).
// - Customer replied by email: no comms layer — email stays outside the OS by design (Principle 2).
// - Provider changed: the change itself works, but nothing logs it yet, so there's no event to
//   raise until an audit log exists.
// - Approaching-SLA: needs confidence in lead-timestamp precision first.
// "Follow-up required" (and, now, payment overdue) is deliberately NOT in this list either, even
// though it's day-one ready — it's a live rollup over quote/booking/ticket/payment state
// (lib/pipeline.ts's computeTripFlags), not a point-in-time event. Storing a shadow copy of that as
// a Notification row would drift from the trip's real state the moment anything on it changes.
// It's surfaced instead as a computed section on the notifications page itself, the same way the
// dashboard already shows "awaiting reply" live rather than from a stored event.
export type NotificationEventType =
  | "website_lead"
  | "website_lead_incomplete"
  | "support_ticket"
  | "quote_accepted"
  | "quote_declined"
  | "booking_created"
  | "returning_customer"
  | "payment_received";

const EVENT_KEY: Record<NotificationEventType, StringKey> = {
  website_lead: "notifWebsiteLead",
  website_lead_incomplete: "notifWebsiteLeadIncomplete",
  support_ticket: "notifSupportTicket",
  quote_accepted: "notifQuoteAccepted",
  quote_declined: "notifQuoteDeclined",
  booking_created: "notifBookingCreated",
  returning_customer: "notifReturningCustomer",
  payment_received: "notifPaymentReceived",
};

export async function createNotification(
  eventType: NotificationEventType,
  tripId: string | null,
  link: string,
  data: Record<string, string | number>
) {
  await prisma.notification.create({
    data: { eventType, tripId, link, data: JSON.stringify(data) },
  });
}

// Renders the sentence at READ time, through the same t()/{var} interpolation every other bilingual
// label in this app uses — a locale switch translates the feed too, not just the chrome around it.
// Falls back to the raw eventType if a row's type predates a since-removed template, rather than
// throwing on old data.
export function describeNotification(locale: Locale, notification: { eventType: string; data: string }): string {
  const key = EVENT_KEY[notification.eventType as NotificationEventType];
  if (!key) return notification.eventType;
  const data = JSON.parse(notification.data) as Record<string, string>;
  return t(locale, key, data);
}
