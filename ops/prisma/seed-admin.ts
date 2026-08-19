// Bootstraps the one Administrator account every fresh database needs before anyone can sign in at
// all (see lib/auth.ts / lib/session.ts — there is no "first run" self-registration flow by design,
// per the founder's staff-only, Administrator-adds-employees model). Idempotent (upsert by email),
// so it's safe to re-run against an existing database — e.g. to reset the bootstrap admin's password.
//
// Local:      npm run db:seed:admin
// Production: BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... DATABASE_URL=<neon url> npm run db:seed:admin
//             (run once, from a machine with the production DATABASE_URL — e.g. `vercel env pull`
//             locally first — then sign in and rotate the password from Settings.)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see .env.example.");
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@tripgatemorocco.com";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME || "Administrator";

async function main() {
  if (!password) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_PASSWORD before running this script (no hardcoded default password — " +
        "this account has Administrator rights from the moment it exists).",
    );
  }

  const passwordHash = hashPassword(password);
  const staff = await prisma.staff.upsert({
    where: { email },
    update: { passwordHash, role: "administrator", status: "active" },
    create: { email, name, passwordHash, role: "administrator", status: "active" },
  });

  console.log(`Administrator account ready: ${staff.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
