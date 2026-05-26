import { datetime, mysqlEnum, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  username: varchar("username", { length: 128 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["viewer", "builder", "dm", "admin"]).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull()
});

export const sessionsTable = mysqlTable("sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  userId: varchar("user_id", { length: 64 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  issuedAt: datetime("issued_at", { mode: "date", fsp: 3 }).notNull(),
  expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull()
});
