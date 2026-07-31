import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { expenses, shares } from "../../../../../../db/schema";
import { AppError, assertActiveMembers, authorize, getBookByInvite, jsonError, makeId, validateAmount, validateText } from "../../../../../../db/service";

async function ownedExpense(bookId: string, expenseId: string, memberId: string, isAdmin: boolean) {
  const [expense] = await getDb().select().from(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.bookId, bookId))).limit(1);
  if (!expense) throw new AppError("这笔账不存在", 404);
  if (!isAdmin && expense.createdBy !== memberId) throw new AppError("你只能修改自己录入的账目", 403);
  return expense;
}

export async function PATCH(request: Request, context: { params: Promise<{ invite: string; expenseId: string }> }) {
  try {
    const { invite, expenseId } = await context.params; const book = await getBookByInvite(invite);
    const { member, isAdmin } = await authorize(request, book.id); await ownedExpense(book.id, expenseId, member.id, isAdmin);
    const body = await request.json() as { title?: string; amount?: number; paidBy?: string; expenseDate?: string; shares?: Array<{ memberId?: string; amount?: number }> };
    const title = validateText(body.title, "消费名称", 60); const amount = validateAmount(body.amount);
    const expenseDate = /^\d{4}-\d{2}-\d{2}$/.test(body.expenseDate ?? "") ? body.expenseDate! : new Date().toISOString().slice(0, 10);
    const shareInputs = Array.isArray(body.shares) ? body.shares.map((item) => ({ memberId: item.memberId ?? "", amount: validateAmount(item.amount) })) : [];
    if (new Set(shareInputs.map((item) => item.memberId)).size !== shareInputs.length) throw new AppError("同一成员不能重复分摊");
    const participantIds = await assertActiveMembers(book.id, [...shareInputs.map((item) => item.memberId), body.paidBy ?? ""]);
    if (!participantIds.includes(body.paidBy ?? "")) throw new AppError("付款人无效");
    if (shareInputs.reduce((sum, item) => sum + item.amount, 0) !== amount) throw new AppError("每人承担金额的合计必须等于总金额");
    const db = getDb();
    await db.batch([
      db.update(expenses).set({ title, amount, paidBy: body.paidBy!, expenseDate, updatedAt: new Date().toISOString() }).where(eq(expenses.id, expenseId)),
      db.delete(shares).where(eq(shares.expenseId, expenseId)),
      ...shareInputs.map((item) => db.insert(shares).values({ id: makeId("shr"), expenseId, memberId: item.memberId, amount: item.amount })),
    ]);
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ invite: string; expenseId: string }> }) {
  try {
    const { invite, expenseId } = await context.params; const book = await getBookByInvite(invite);
    const { member, isAdmin } = await authorize(request, book.id); await ownedExpense(book.id, expenseId, member.id, isAdmin);
    await getDb().delete(expenses).where(eq(expenses.id, expenseId));
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
