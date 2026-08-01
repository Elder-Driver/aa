import { authorize, getBookByInvite, jsonError, snapshot } from "../../../../db/service";

export async function GET(request: Request, context: { params: Promise<{ invite: string }> }) {
  try {
    const { invite } = await context.params;
    const book = await getBookByInvite(invite);
    let viewerId: string | undefined;
    let isAdmin = false;
    if (request.headers.get("x-member-token")) {
      try {
        const auth = await authorize(request, book.id);
        viewerId = auth.member.id;
        isAdmin = auth.isAdmin;
      } catch {
        viewerId = undefined;
        isAdmin = false;
      }
    }
    return Response.json(await snapshot(book.id, viewerId, isAdmin));
  } catch (error) { return jsonError(error); }
}
