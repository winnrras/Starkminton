import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const hits = sqliteTable("hits", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  x: real("x").notNull(),
  y: real("y").notNull(),
  force: real("force").notNull(),
  sweet: integer("sweet", { mode: "boolean" }),
  deviceTimestamp: integer("device_timestamp"),
  recordedAt: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Hit = typeof hits.$inferSelect;
export type NewHit = typeof hits.$inferInsert;
