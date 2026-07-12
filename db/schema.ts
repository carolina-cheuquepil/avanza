import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull().default("PC"),
  context: text("context").notNull().default(""),
  priority: text("priority").notNull().default("Media"),
  status: text("status").notNull().default("pendiente"),
  nextStep: text("next_step").notNull().default(""),
  ifThen: text("if_then").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
