import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { books } from "../../../../../db/schema";
import { AppError, authorize, getBookByInvite, hashToken, jsonError, token } from "../../../../../db/service";

export async function POST(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params; const book = await getBookByInvite(invite);
    const { isAdmin } = await authorize(request, book.id); if (!isAdmin) throw new AppError("只有创建者可以更新邀请链接", 403);
    const inviteToken = token(); await getDb().update(books).set({ inviteTokenHash: await hashToken(inviteToken) }).where(eq(books.id, book.id));
    return Response.json({ inviteToken });
  } catch (error) { return jsonError(error); }
}
