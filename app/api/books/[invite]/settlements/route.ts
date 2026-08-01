import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { settlements } from "../../../../../db/schema";
import { AppError, assertActiveMembers, authorize, getBookByInvite, jsonError, makeId, validateAmount } from "../../../../../db/service";

const methods = new Set(["zelle", "venmo", "apple-cash", "cash", "other"]);

export async function POST(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    const { member } = await authorize(request, book.id);
    const body = await request.json() as { fromMemberId?: string; toMemberId?: string; amount?: number; method?: string };
    const amount = validateAmount(body.amount);
    const from = body.fromMemberId ?? "";
    const to = body.toMemberId ?? "";
    const method = methods.has(body.method || "") ? body.method! : "other";
    if (from === to) throw new AppError("Payer and receiver cannot be the same person");
    await assertActiveMembers(book.id, [from, to]);
    await getDb().insert(settlements).values({ id: makeId("set"), bookId: book.id, fromMemberId: from, toMemberId: to, amount, method, createdBy: member.id });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    const { member, isAdmin } = await authorize(request, book.id);
    const body = await request.json().catch(() => ({})) as { settlementId?: string };
    const settlementId = body.settlementId ?? "";
    if (!settlementId.startsWith("set_")) throw new AppError("Invalid settlement");
    const [row] = await getDb().select().from(settlements).where(and(eq(settlements.id, settlementId), eq(settlements.bookId, book.id))).limit(1);
    if (!row) throw new AppError("Settlement not found", 404);
    if (!isAdmin && row.createdBy !== member.id) throw new AppError("Only the person who marked this payment can cancel it", 403);
    await getDb().delete(settlements).where(eq(settlements.id, settlementId));
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
