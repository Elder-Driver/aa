import { getDb } from "../../../db";
import { books, members } from "../../../db/schema";
import { hashToken, jsonError, makeId, token, validateText } from "../../../db/service";

const currencies = new Set(["CNY", "USD", "EUR", "JPY", "GBP", "HKD", "TWD", "KRW", "THB"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; currency?: string; nickname?: string };
    const name = validateText(body.name, "账本名称", 40);
    const nickname = validateText(body.nickname, "昵称", 24);
    const currency = currencies.has(body.currency ?? "") ? body.currency! : "USD";
    const inviteToken = token(); const adminToken = token(); const memberToken = token();
    const bookId = makeId("book"); const memberId = makeId("mem");
    const db = getDb();
    await db.batch([
      db.insert(books).values({ id: bookId, name, currency, inviteTokenHash: await hashToken(inviteToken), adminTokenHash: await hashToken(adminToken) }),
      db.insert(members).values({ id: memberId, bookId, name: nickname, authTokenHash: await hashToken(memberToken), isCreator: true }),
    ]);
    return Response.json({ inviteToken, adminToken, memberToken, memberId }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
