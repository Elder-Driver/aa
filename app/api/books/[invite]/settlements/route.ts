import { getDb } from "../../../../../db";
import { settlements } from "../../../../../db/schema";
import { AppError, assertActiveMembers, authorize, getBookByInvite, jsonError, makeId, validateAmount } from "../../../../../db/service";

export async function POST(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params; const book = await getBookByInvite(invite);
    const { member } = await authorize(request, book.id);
    const body = await request.json() as { fromMemberId?: string; toMemberId?: string; amount?: number };
    const amount = validateAmount(body.amount); const from = body.fromMemberId ?? ""; const to = body.toMemberId ?? "";
    if (from === to) throw new AppError("付款人和收款人不能相同");
    await assertActiveMembers(book.id, [from, to]);
    await getDb().insert(settlements).values({ id: makeId("set"), bookId: book.id, fromMemberId: from, toMemberId: to, amount, createdBy: member.id });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
