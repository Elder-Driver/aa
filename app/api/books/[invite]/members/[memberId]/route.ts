import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { members } from "../../../../../../db/schema";
import { AppError, authorize, getBookByInvite, hashToken, jsonError, token } from "../../../../../../db/service";

export async function PATCH(request: Request, context: { params: Promise<{ invite: string; memberId: string }> }) {
  try {
    const { invite, memberId } = await context.params; const book = await getBookByInvite(invite);
    const { member, isAdmin } = await authorize(request, book.id);
    const body = await request.json() as { action?: "deactivate" | "reactivate" | "regenerate" | "profile"; paymentMethod?: string; paymentAccount?: string };
    const db = getDb(); const [target] = await db.select().from(members).where(and(eq(members.bookId, book.id), eq(members.id, memberId))).limit(1);
    if (!target) throw new AppError("成员不存在", 404); if (target.isCreator && body.action === "deactivate") throw new AppError("不能停用账本创建者");
    if (body.action === "profile" || (!body.action && ("paymentMethod" in body || "paymentAccount" in body))) {
      if (!isAdmin && member.id !== memberId) throw new AppError("只能修改自己的收款方式", 403);
      const allowed = new Set(["zelle", "venmo", "apple-cash", "cash", "other", ""]);
      const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
      const paymentAccount = typeof body.paymentAccount === "string" ? body.paymentAccount.trim() : "";
      if (!allowed.has(paymentMethod)) throw new AppError("不支持这个收款方式");
      if (paymentAccount.length > 80) throw new AppError("账号备注不能超过 80 个字");
      await db.update(members).set({ paymentMethod: paymentMethod || null, paymentAccount: paymentAccount || null }).where(eq(members.id, memberId));
      return Response.json({ ok: true });
    }
    if (!isAdmin) throw new AppError("只有创建者可以管理成员", 403);
    if (body.action === "regenerate") {
      const memberToken = token(); await db.update(members).set({ authTokenHash: await hashToken(memberToken) }).where(eq(members.id, memberId));
      return Response.json({ memberToken, memberId });
    }
    if (body.action === "deactivate" || body.action === "reactivate") {
      await db.update(members).set({ inactive: body.action === "deactivate" }).where(eq(members.id, memberId));
      return Response.json({ ok: true });
    }
    throw new AppError("不支持的操作");
  } catch (error) { return jsonError(error); }
}
