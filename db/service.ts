import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./index";
import { books, expenses, members, settlements, shares } from "./schema";
import { minimalTransfers } from "../lib/calculations";

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function jsonError(error: unknown) {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof Error ? error.message : "暂时无法完成，请稍后再试";
  return Response.json({ error: status === 500 ? "服务暂时不可用，请稍后再试" : message }, { status });
}

export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function hashToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

export async function getBookByInvite(invite: string) {
  if (!invite || invite.length < 20) throw new AppError("这个邀请链接无效", 404);
  const db = getDb();
  const [book] = await db.select().from(books).where(eq(books.inviteTokenHash, await hashToken(invite))).limit(1);
  if (!book) throw new AppError("找不到这个账本，邀请链接可能已经更新", 404);
  return book;
}

export async function authorize(request: Request, bookId: string) {
  const memberToken = request.headers.get("x-member-token") ?? "";
  const adminToken = request.headers.get("x-admin-token") ?? "";
  const db = getDb();
  const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
  if (!book) throw new AppError("账本不存在", 404);
  const isAdmin = Boolean(adminToken) && (await hashToken(adminToken)) === book.adminTokenHash;
  if (!memberToken) throw new AppError("请先用昵称加入账本", 401);
  const [member] = await db.select().from(members).where(and(eq(members.bookId, bookId), eq(members.authTokenHash, await hashToken(memberToken)))).limit(1);
  if (!member || member.inactive) throw new AppError("成员身份已失效，请联系账本创建者", 401);
  return { member, isAdmin, book };
}

export function validateText(value: unknown, label: string, max = 40) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new AppError(`请填写${label}`);
  if (result.length > max) throw new AppError(`${label}不能超过 ${max} 个字`);
  return result;
}

export function validateAmount(value: unknown) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0 || result > 999999999999) throw new AppError("金额必须大于 0");
  return result;
}

export async function snapshot(bookId: string) {
  const db = getDb();
  const [bookRows, memberRows, expenseRows, settlementRows] = await Promise.all([
    db.select({ id: books.id, name: books.name, currency: books.currency, createdAt: books.createdAt }).from(books).where(eq(books.id, bookId)),
    db.select().from(members).where(eq(members.bookId, bookId)).orderBy(members.createdAt),
    db.select().from(expenses).where(eq(expenses.bookId, bookId)).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt)),
    db.select().from(settlements).where(eq(settlements.bookId, bookId)).orderBy(desc(settlements.createdAt)),
  ]);
  const expenseIds = expenseRows.map((item) => item.id);
  const shareRows = expenseIds.length ? await db.select().from(shares).where(inArray(shares.expenseId, expenseIds)) : [];
  const stats = new Map(memberRows.map((member) => [member.id, { paid: 0, owed: 0, sent: 0, received: 0 }]));
  for (const expense of expenseRows) stats.get(expense.paidBy)!.paid += expense.amount;
  for (const share of shareRows) stats.get(share.memberId)!.owed += share.amount;
  for (const item of settlementRows) {
    stats.get(item.fromMemberId)!.sent += item.amount;
    stats.get(item.toMemberId)!.received += item.amount;
  }
  const memberView = memberRows.map((member) => {
    const stat = stats.get(member.id)!;
    return { ...member, ...stat, balance: stat.paid - stat.owed + stat.sent - stat.received, authTokenHash: undefined };
  });
  const expenseView = expenseRows.map((expense) => ({ ...expense, shares: shareRows.filter((share) => share.expenseId === expense.id) }));
  const suggestions = minimalTransfers(memberView.map((member) => ({ id: member.id, balance: member.balance })));
  return {
    book: bookRows[0], members: memberView, expenses: expenseView, settlements: settlementRows,
    totalSpent: expenseRows.reduce((sum, item) => sum + item.amount, 0), suggestions,
  };
}

export async function assertActiveMembers(bookId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new AppError("请至少选择一位参与人");
  const rows = await getDb().select({ id: members.id }).from(members).where(and(eq(members.bookId, bookId), eq(members.inactive, false), inArray(members.id, unique)));
  if (rows.length !== unique.length) throw new AppError("参与成员无效或已停用");
  return unique;
}

export async function nicknameExists(bookId: string, name: string) {
  const rows = await getDb().select({ id: members.id }).from(members).where(and(eq(members.bookId, bookId), sql`lower(${members.name}) = lower(${name})`)).limit(1);
  return rows.length > 0;
}
