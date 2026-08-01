import { env } from "cloudflare:workers";

type AdminBookRow = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  lastActivityAt: string;
  membersCount: number;
  expensesCount: number;
  settlementsCount: number;
  totalSpent: number;
};

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

async function listBooks() {
  const result = await env.DB.prepare(`
    SELECT
      b.id,
      b.name,
      b.currency,
      b.created_at AS createdAt,
      COALESCE((
        SELECT MAX(value) FROM (
          SELECT b.created_at AS value
          UNION ALL SELECT MAX(created_at) FROM members WHERE book_id = b.id
          UNION ALL SELECT MAX(updated_at) FROM expenses WHERE book_id = b.id
          UNION ALL SELECT MAX(created_at) FROM settlements WHERE book_id = b.id
        )
      ), b.created_at) AS lastActivityAt,
      (SELECT COUNT(*) FROM members WHERE book_id = b.id) AS membersCount,
      (SELECT COUNT(*) FROM expenses WHERE book_id = b.id) AS expensesCount,
      (SELECT COUNT(*) FROM settlements WHERE book_id = b.id) AS settlementsCount,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE book_id = b.id), 0) AS totalSpent
    FROM books b
    ORDER BY lastActivityAt DESC
    LIMIT 200
  `).all<AdminBookRow>();
  return result.results ?? [];
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const books = await listBooks();
    const totals = books.reduce((acc, book) => ({
      books: acc.books + 1,
      members: acc.members + book.membersCount,
      expenses: acc.expenses + book.expensesCount,
      settlements: acc.settlements + book.settlementsCount,
      totalSpent: acc.totalSpent + book.totalSpent,
      emptyBooks: acc.emptyBooks + (book.expensesCount === 0 && book.settlementsCount === 0 ? 1 : 0),
    }), { books: 0, members: 0, expenses: 0, settlements: 0, totalSpent: 0, emptyBooks: 0 });
    return Response.json({ books, totals });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError("Unable to load admin data", 500);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await request.json().catch(() => ({})) as { action?: string; days?: number };
    if (body.action !== "delete-empty") return jsonError("Unsupported admin action");
    const days = Number.isInteger(body.days) && body.days! >= 0 ? body.days! : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const result = await env.DB.prepare(`
      DELETE FROM books
      WHERE id IN (
        SELECT b.id
        FROM books b
        WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE book_id = b.id)
          AND NOT EXISTS (SELECT 1 FROM settlements WHERE book_id = b.id)
          AND b.created_at < ?
      )
    `).bind(cutoff).run();
    return Response.json({ deleted: result.meta.changes ?? 0 });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError("Unable to run admin action", 500);
  }
}
