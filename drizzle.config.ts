import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Explicitly load .env.local so drizzle-kit picks up Turso credentials
config({ path: ".env.local" });

if (!process.env.TURSO_DATABASE_URL) {
  console.warn(
    "⚠️  TURSO_DATABASE_URL is not set — falling back to local.db. " +
      "Make sure .env.local contains TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
  );
}

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;