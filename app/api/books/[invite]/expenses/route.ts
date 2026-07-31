import { getDb } from "../../../../../db";
import { expenses, shares } from "../../../../../db/schema";
import { AppError, assertActiveMembers, authorize, getBookByInvite, jsonError, makeId, validateAmount, validateText } from "../../../../../db/service";

type ShareInput = { memberId?: string; amount?: number };

export async function POST(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    const { member } = await authorize(request, book.id);
    const body = await request.json() as { title?: string; amount?: number; paidBy?: string; expenseDate?: string; shares?: ShareInput[] };
    const title = validateText(body.title, "消费名称", 60);
    const amount = validateAmount(body.amount);
    const expenseDate = /^\d{4}-\d{2}-\d{2}$/.test(body.expenseDate ?? "") ? body.expenseDate! : new Date().toISOString().slice(0, 10);
    const shareInputs = Array.isArray(body.shares) ? body.shares.map((item) => ({ memberId: item.memberId ?? "", amount: validateAmount(item.amount) })) : [];
    if (new Set(shareInputs.map((item) => item.memberId)).size !== shareInputs.length) throw new AppError("同一成员不能重复分摊");
    const participantIds = await assertActiveMembers(book.id, [...shareInputs.map((item) => item.memberId), body.paidBy ?? ""]);
    if (!participantIds.includes(body.paidBy ?? "")) throw new AppError("付款人无效");
    if (shareInputs.reduce((sum, item) => sum + item.amount, 0) !== amount) throw new AppError("每人承担金额的合计必须等于总金额");
    const expenseId = makeId("exp"); const db = getDb();
    await db.batch([
      db.insert(expenses).values({ id: expenseId, bookId: book.id, title, amount, paidBy: body.paidBy!, createdBy: member.id, expenseDate }),
      ...shareInputs.map((item) => db.insert(shares).values({ id: makeId("shr"), expenseId, memberId: item.memberId, amount: item.amount })),
    ]);
    return Response.json({ id: expenseId }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
