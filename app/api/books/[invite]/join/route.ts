import { getDb } from "../../../../../db";
import { members } from "../../../../../db/schema";
import { AppError, getBookByInvite, hashToken, jsonError, makeId, nicknameExists, token, validateText } from "../../../../../db/service";

export async function POST(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    const body = await request.json() as { nickname?: string };
    const name = validateText(body.nickname, "昵称", 24);
    if (await nicknameExists(book.id, name)) throw new AppError("这个昵称已经有人使用了，请换一个");
    const memberToken = token(); const memberId = makeId("mem");
    await getDb().insert(members).values({ id: memberId, bookId: book.id, name, authTokenHash: await hashToken(memberToken) });
    return Response.json({ memberToken, memberId }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
