import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  inviteTokenHash: text("invite_token_hash").notNull(),
  adminTokenHash: text("admin_token_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("books_invite_token_idx").on(table.inviteTokenHash)]);

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  authTokenHash: text("auth_token_hash").notNull(),
  isCreator: integer("is_creator", { mode: "boolean" }).notNull().default(false),
  inactive: integer("inactive", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("members_book_name_idx").on(table.bookId, table.name),
  index("members_book_idx").on(table.bookId),
]);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  paidBy: text("paid_by").notNull().references(() => members.id),
  createdBy: text("created_by").notNull().references(() => members.id),
  expenseDate: text("expense_date").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("expenses_book_date_idx").on(table.bookId, table.expenseDate)]);

export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id),
  amount: integer("amount").notNull(),
}, (table) => [
  uniqueIndex("shares_expense_member_idx").on(table.expenseId, table.memberId),
  index("shares_expense_idx").on(table.expenseId),
]);

export const settlements = sqliteTable("settlements", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  fromMemberId: text("from_member_id").notNull().references(() => members.id),
  toMemberId: text("to_member_id").notNull().references(() => members.id),
  amount: integer("amount").notNull(),
  createdBy: text("created_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("settlements_book_idx").on(table.bookId)]);
