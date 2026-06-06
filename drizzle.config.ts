import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use the owner/role connection for schema migrations (DDL).
    url: process.env.DATABASE_URL!,
  },
  // Tables managed by Neon Auth live in neon_auth.* — never let drizzle-kit
  // try to drop or alter them.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
} satisfies Config;
