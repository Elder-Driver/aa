import { getBookByInvite, jsonError, snapshot } from "../../../../db/service";

export async function GET(_request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    return Response.json(await snapshot(book.id));
  } catch (error) { return jsonError(error); }
}
