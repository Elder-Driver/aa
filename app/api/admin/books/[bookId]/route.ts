import { env } from "cloudflare:workers";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function requireAdmin(request: Request) {
  const configured = env.ADMIN_KEY?.trim();
  if (!configured) throw jsonError("ADMIN_KEY is not configured", 503);
  const url = new URL(request.url);
  const provided = request.headers.get("x-admin-key") || url.searchParams.get("key") || "";
  if (provided !== configured) throw jsonError("Invalid admin key", 401);
}

export async function DELETE(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    requireAdmin(request);
    const { bookId } = await context.params;
    if (!bookId.startsWith("book_")) return jsonError("Invalid book id");
    const result = await env.DB.prepare("DELETE FROM books WHERE id = ?").bind(bookId).run();
    return Response.json({ deleted: result.meta.changes ?? 0 });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError("Unable to delete book", 500);
  }
}
