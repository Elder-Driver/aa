import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { members } from "../../../../../../db/schema";
import { AppError, authorize, getBookByInvite, hashToken, jsonError, token } from "../../../../../../db/service";

export async function PATCH(request: Request, context: { params: Promise<{ invite: string; memberId: string }> }) {
  try {
    const { invite, memberId } = await context.params; const book = await getBookByInvite(invite);
    const { isAdmin } = await authorize(request, book.id); if (!isAdmin) throw new AppError("只有创建者可以管理成员", 403);
    const body = await request.json() as { action?: "deactivate" | "reactivate" | "regenerate" };
    const db = getDb(); const [target] = await db.select().from(members).where(and(eq(members.bookId, book.id), eq(members.id, memberId))).limit(1);
    if (!target) throw new AppError("成员不存在", 404); if (target.isCreator && body.action === "deactivate") throw new AppError("不能停用账本创建者");
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
