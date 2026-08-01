"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type AdminBook = {
  id: string;
  name: string;
  currency: string;
  inviteToken: string;
  createdAt: string;
  lastActivityAt: string;
  membersCount: number;
  expensesCount: number;
  settlementsCount: number;
  totalSpent: number;
};

type AdminPayload = {
  books: AdminBook[];
  totals: { books: number; members: number; expenses: number; settlements: number; totalSpent: number; emptyBooks: number };
};

const adminKeyStorage = "aa:admin-key";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function ageDays(value: string) {
  const time = new Date(`${value.replace(" ", "T")}Z`).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

export function AdminApp() {
  const [key, setKey] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem(adminKeyStorage) || "");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(30);
  const [copiedBook, setCopiedBook] = useState("");
  const triedStoredKey = useRef(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const staleEmpty = useMemo(() => data?.books.filter((book) => book.expensesCount === 0 && book.settlementsCount === 0 && ageDays(book.createdAt) >= days) ?? [], [data, days]);

  const load = useCallback(async (nextKey: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/books", { headers: { "x-admin-key": nextKey } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load admin data");
      localStorage.setItem(adminKeyStorage, nextKey);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin data");
      setData(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (triedStoredKey.current || !key) return;
    triedStoredKey.current = true;
    void load(key);
  }, [key, load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submittedKey = String(new FormData(form).get("adminKey") || keyInputRef.current?.value || key).trim();
    if (!submittedKey) {
      setError("Enter the admin key first");
      return;
    }
    setKey(submittedKey);
    await load(submittedKey);
  }

  async function cleanup() {
    if (!confirm(`Delete ${staleEmpty.length} empty books older than ${days} days?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ action: "delete-empty", days }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Cleanup failed");
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite(book: AdminBook) {
    const url = `${location.origin}/b/${encodeURIComponent(book.inviteToken)}`;
    await navigator.clipboard.writeText(url);
    setCopiedBook(book.id);
    window.setTimeout(() => setCopiedBook(""), 1600);
  }

  async function removeBook(book: AdminBook) {
    if (!confirm(`Delete "${book.name}" and all its data?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/books/${encodeURIComponent(book.id)}`, { method: "DELETE", headers: { "x-admin-key": key } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Delete failed");
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function changeKey() {
    localStorage.removeItem(adminKeyStorage);
    setData(null);
    setError("");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow">AA owner</p><h1>Database cleanup</h1></div>
        <Link href="/">Back to app</Link>
      </header>

      {!data ? <form className="admin-key-card" onSubmit={submit}>
        <label>Admin key<input ref={keyInputRef} name="adminKey" defaultValue={key} onInput={(event) => setKey(event.currentTarget.value)} autoComplete="current-password" placeholder="ADMIN_KEY" type="password" /></label>
        <button className="primary" disabled={busy}>{busy ? "Loading..." : "Load database"}</button>
      </form> : <div className="admin-session-card"><span>Admin connected</span><button className="secondary" type="button" onClick={() => load(key)} disabled={busy}>{busy ? "Refreshing..." : "Refresh"}</button><button className="secondary" type="button" onClick={changeKey}>Change key</button></div>}
      {error && <p className="form-error">{error}</p>}

      {data && <>
        <section className="admin-stats">
          <article><span>Books</span><b>{data.totals.books}</b></article>
          <article><span>Empty books</span><b>{data.totals.emptyBooks}</b></article>
          <article><span>Members</span><b>{data.totals.members}</b></article>
          <article><span>Expenses</span><b>{data.totals.expenses}</b></article>
        </section>

        <section className="admin-cleanup">
          <div><h2>Old empty books</h2><p>Empty books have no expenses and no settlements. These are usually abandoned tests.</p></div>
          <label>Older than<input type="number" min={0} value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
          <button className="danger" type="button" disabled={busy || staleEmpty.length === 0} onClick={cleanup}>Delete {staleEmpty.length} empty</button>
        </section>

        <section className="admin-table-card">
          <div className="section-head"><h2>Recent books</h2><button className="secondary" disabled={busy} onClick={() => load(key)}>Refresh</button></div>
          <div className="admin-table">
            <div className="admin-row admin-row-head"><span>Name</span><span>Last activity</span><span>Data</span><span>Total</span><span>Actions</span></div>
            {data.books.map((book) => <div className="admin-row" key={book.id}>
              <span><b title={book.name}>{book.name}</b><small>{book.id}</small></span>
              <span>{ageDays(book.lastActivityAt)} days ago<small>{book.lastActivityAt}</small></span>
              <span>{book.membersCount} members · {book.expensesCount} expenses · {book.settlementsCount} payments</span>
              <span>{money(book.totalSpent, book.currency)}</span>
              <span className="admin-actions"><button className="secondary" type="button" disabled={busy} onClick={() => copyInvite(book)}>{copiedBook === book.id ? "Copied" : "Copy link"}</button><button className="danger" type="button" disabled={busy} onClick={() => removeBook(book)}>Delete</button></span>
            </div>)}
          </div>
        </section>
      </>}
    </main>
  );
}
