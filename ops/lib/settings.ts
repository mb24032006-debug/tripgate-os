import { prisma } from "./db";

export type EnabledModules = {
  leads: boolean;
  quotes: boolean;
  support: boolean;
  bookings: boolean;
  documents: boolean;
  payments: boolean;
  knowledgeBase: boolean;
  availability: boolean;
  customerPortal: boolean;
};

// "Build the entire architecture now, activate features progressively" (founder's direction,
// architecture/01_TARGET_ARCHITECTURE.md) — this is the single row that decides what's visible in
// the nav. Every table behind a disabled module still exists; only the UI surface is gated.
export async function getSettings() {
  const row = await prisma.organizationSettings.findFirst();
  const enabledModules: EnabledModules = row
    ? JSON.parse(row.enabledModules)
    : {
        leads: true,
        quotes: true,
        support: true,
        bookings: false,
        documents: false,
        payments: false,
        knowledgeBase: true,
        availability: false,
        customerPortal: false,
      };
  return {
    operatingModel: row?.operatingModel ?? "intermediary",
    enabledModules,
  };
}
