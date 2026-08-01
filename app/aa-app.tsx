"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { splitEqually } from "../lib/calculations";

type Lang = "zh" | "en";
type Member = { id: string; name: string; isCreator: boolean; inactive: boolean; paymentMethod?: string | null; paymentAccount?: string | null; paid: number; owed: number; sent: number; received: number; balance: number };
type ExpenseShare = { id: string; expenseId: string; memberId: string; amount: number };
type Expense = { id: string; title: string; amount: number; paidBy: string; createdBy: string; expenseDate: string; createdAt: string; shares: ExpenseShare[] };
type Settlement = { id: string; fromMemberId: string; toMemberId: string; amount: number; method?: string | null; createdBy: string; createdAt: string };
type Snapshot = { book: { id: string; name: string; currency: string; createdAt: string }; members: Member[]; expenses: Expense[]; settlements: Settlement[]; totalSpent: number; suggestions: Array<{ fromMemberId: string; toMemberId: string; amount: number }> };
type Identity = { memberToken: string; memberId: string; adminToken?: string };
type RecentBook = { invite: string; name: string; currency: string; memberName: string; updatedAt: number; identity: Identity };
type Tab = "home" | "expenses" | "members" | "settle";

const copy = {
  zh: {
    appName: "AA",
    brandText: ".aaa.codes",
    tagline: "出门一起玩，账也轻松分",
    createBook: "新建账本",
    bookName: "账本名称",
    bookPlaceholder: "例如：New York weekend",
    nickname: "你的昵称",
    nicknamePlaceholder: "朋友认得出的名字",
    currency: "币种",
    create: "创建账本",
    creating: "创建中...",
    openInvite: "新建一个旅行账本，把链接发给朋友。谁花了钱就记一笔，最后按最少转账结清。",
    inviteFriends: "邀请朋友",
    travelBook: "账本",
    membersCount: "位成员",
    overview: "概览",
    expenses: "账目",
    members: "成员",
    settle: "结算",
    totalSpent: "总支出",
    myBalance: "我的净额",
    recent: "最近账目",
    allExpenses: "全部账目",
    addExpense: "记一笔",
    paidBy: "付款",
    splitBy: "人分摊",
    balances: "成员余额",
    paid: "付款",
    owes: "应付",
    receives: "应收",
    owed: "分到",
    net: "余额",
    viewSettle: "看怎么结清",
    emptyExpenses: "还没有账目",
    emptyExpensesHint: "先记一笔住宿、打车或吃饭。",
    joinTitle: "加入账本",
    join: "加入",
    joining: "加入中...",
    expenseTitle: "名称",
    amount: "金额",
    date: "日期",
    payer: "谁付的",
    participants: "谁参与分摊",
    equal: "均分",
    custom: "自定义",
    allocated: "已分配",
    save: "保存",
    saving: "保存中...",
    delete: "删除",
    cancel: "取消",
    readonly: "这笔账由其他成员录入，你可以查看但不能修改。",
    details: "账目详情",
    newExpense: "新增账目",
    noIdentity: "先用昵称加入这个账本。",
    settlements: "最少转账建议",
    settleHint: "按最终净额合并后，转账次数会更少。",
    markPaid: "标记已转",
    paymentProfile: "我的收款方式",
    paymentProfileHint: "只在别人需要转账给你时显示。",
    paymentMethod: "方式",
    paymentAccount: "账号 / 备注",
    noPaymentAccount: "还没写收款方式",
    allClear: "已经结清",
    allClearHint: "当前没有人需要转账。",
    history: "已记录还款",
    shareTitle: "邀请朋友加入",
    shareBody: "把这个链接发给同行的人。对方填写唯一昵称后，就能一起记账。",
    copyLink: "复制链接",
    copied: "已复制",
    resetInvite: "重置邀请链接",
    linkChanged: "邀请链接已更新",
    memberLinkCopied: "个人访问链接已复制",
    regenerate: "重发访问链接",
    deactivate: "停用",
    reactivate: "恢复",
    creator: "创建者",
    currentUser: "我",
    inactive: "已停用",
    member: "成员",
    loading: "正在打开账本...",
    backHome: "回到首页",
    cannotOpen: "这个链接没能打开",
    networkError: "网络开小差了，请再试一次",
    invalidSplit: "分摊金额需要大于 0，且合计等于总金额。",
    selectOne: "请至少选择一位参与者",
    confirmDelete: "确定删除这笔账吗？",
    confirmReset: "重置后旧邀请链接会失效，继续吗？",
    language: "English",
  },
  en: {
    appName: "AA",
    brandText: ".aaa.codes",
    tagline: "Split the trip, keep the fun",
    createBook: "New trip",
    bookName: "Trip name",
    bookPlaceholder: "e.g. New York weekend",
    nickname: "Your name",
    nicknamePlaceholder: "A name friends recognize",
    currency: "Currency",
    create: "Create trip",
    creating: "Creating...",
    openInvite: "Create a trip book, send the link, record shared costs, and settle with the fewest transfers.",
    inviteFriends: "Invite",
    travelBook: "Trip",
    membersCount: "members",
    overview: "Overview",
    expenses: "Expenses",
    members: "People",
    settle: "Settle",
    totalSpent: "Total spent",
    myBalance: "My balance",
    recent: "Recent",
    allExpenses: "All expenses",
    addExpense: "Add expense",
    paidBy: "paid",
    splitBy: "split",
    balances: "Balances",
    paid: "Paid",
    owes: "Owes",
    receives: "Gets back",
    owed: "Share",
    net: "Net",
    viewSettle: "See settlement",
    emptyExpenses: "No expenses yet",
    emptyExpensesHint: "Add the first hotel, ride, or meal.",
    joinTitle: "Join trip",
    join: "Join",
    joining: "Joining...",
    expenseTitle: "Name",
    amount: "Amount",
    date: "Date",
    payer: "Paid by",
    participants: "Split between",
    equal: "Equal",
    custom: "Custom",
    allocated: "Allocated",
    save: "Save",
    saving: "Saving...",
    delete: "Delete",
    cancel: "Cancel",
    readonly: "This expense was added by someone else. You can view it but cannot edit it.",
    details: "Expense details",
    newExpense: "New expense",
    noIdentity: "Join this trip with a name first.",
    settlements: "Fewest transfers",
    settleHint: "Balances are merged first, so fewer people need to send money.",
    markPaid: "Mark paid",
    paymentProfile: "My payment info",
    paymentProfileHint: "Shown only when someone needs to pay you.",
    paymentMethod: "Method",
    paymentAccount: "Account / note",
    noPaymentAccount: "No payment info yet",
    allClear: "All settled",
    allClearHint: "No one needs to transfer money right now.",
    history: "Recorded payments",
    shareTitle: "Invite people",
    shareBody: "Send this link to the group. Each person joins with a unique name.",
    copyLink: "Copy link",
    copied: "Copied",
    resetInvite: "Reset invite link",
    linkChanged: "Invite link updated",
    memberLinkCopied: "Personal access link copied",
    regenerate: "New access link",
    deactivate: "Disable",
    reactivate: "Restore",
    creator: "Creator",
    currentUser: "Me",
    inactive: "Inactive",
    member: "Member",
    loading: "Opening trip...",
    backHome: "Back home",
    cannotOpen: "This link could not be opened",
    networkError: "Something went wrong. Try again.",
    invalidSplit: "Shares must be above 0 and add up to the total.",
    selectOne: "Choose at least one participant",
    confirmDelete: "Delete this expense?",
    confirmReset: "The old invite link will stop working. Continue?",
    language: "中文",
  },
} satisfies Record<Lang, Record<string, string>>;

type Text = (typeof copy)["zh"];

const currencyOptions = [
  ["USD", "USD $"], ["CNY", "CNY ¥"], ["EUR", "EUR €"], ["GBP", "GBP £"], ["JPY", "JPY ¥"],
  ["HKD", "HKD $"], ["TWD", "TWD NT$"], ["KRW", "KRW ₩"], ["THB", "THB ฿"],
];
const zeroDecimal = new Set(["JPY", "KRW"]);
const langKey = "splitpack:lang";
const recentKey = "splitpack:recent";
const today = () => new Date().toISOString().slice(0, 10);
const sessionKey = (invite: string) => `splitpack:${invite}`;
const bookPath = (invite: string) => `/b/${encodeURIComponent(invite)}`;
const toDateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
};
const monthLabel = (value: Date) => value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
function isEqualSplitExpense(expense: Expense | null) {
  if (!expense || !expense.shares.length) return false;
  const ids = expense.shares.map((share) => share.memberId);
  const expected = splitEqually(expense.amount, ids);
  return expected.every((share) => expense.shares.some((item) => item.memberId === share.memberId && item.amount === share.amount));
}

function membersWithMeFirst(members: Member[], memberId?: string) {
  return [...members].sort((a, b) => {
    if (a.id === memberId) return -1;
    if (b.id === memberId) return 1;
    return 0;
  });
}

function minorFromInput(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * (zeroDecimal.has(currency) ? 1 : 100));
}

function inputFromMinor(value: number, currency: string) {
  return (value / (zeroDecimal.has(currency) ? 1 : 100)).toFixed(zeroDecimal.has(currency) ? 0 : 2);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
    maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
  }).format(value / (zeroDecimal.has(currency) ? 1 : 100));
}

function signedMoney(value: number, currency: string) {
  if (value === 0) return money(0, currency);
  return `${value > 0 ? "+" : "-"}${money(Math.abs(value), currency)}`;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return data.error || fallback;
}

function readRecentBooks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentKey) || "[]") as RecentBook[];
    return parsed.filter((item) => item.invite && item.identity?.memberToken && item.identity?.memberId).slice(0, 8);
  } catch {
    return [];
  }
}

function writeRecentBook(item: RecentBook) {
  const next = [item, ...readRecentBooks().filter((book) => book.invite !== item.invite)].slice(0, 8);
  localStorage.setItem(recentKey, JSON.stringify(next));
  return next;
}

export function AAApp() {
  const [lang, setLang] = useState<Lang>("zh");
  const t = copy[lang];
  const [invite, setInvite] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);

  useEffect(() => {
    const storedLang = localStorage.getItem(langKey);
    // Browser language preference and invite identity are restored at hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedLang === "zh" || storedLang === "en") setLang(storedLang);
    const params = new URLSearchParams(window.location.search);
    const pathInvite = /^\/b\/([^/?#]+)\/?$/.exec(window.location.pathname)?.[1] || "";
    const foundInvite = pathInvite ? decodeURIComponent(pathInvite) : params.get("book") || "";
    const incomingMember = params.get("member");
    const incomingMemberId = params.get("memberId");
    if (foundInvite) params.delete("book");
    if (foundInvite && incomingMember && incomingMemberId) {
      localStorage.setItem(sessionKey(foundInvite), JSON.stringify({ memberToken: incomingMember, memberId: incomingMemberId }));
      params.delete("member");
      params.delete("memberId");
    }
    if (foundInvite && (pathInvite !== foundInvite || window.location.search.includes("book=") || incomingMember || incomingMemberId)) {
      history.replaceState(null, "", `${bookPath(foundInvite)}${params.toString() ? `?${params.toString()}` : ""}`);
    }
    setRecentBooks(readRecentBooks());
    setInvite(foundInvite);
    if (foundInvite) {
      try { setIdentity(JSON.parse(localStorage.getItem(sessionKey(foundInvite)) || "null")); } catch { setIdentity(null); }
    }
    setLoading(false);
  }, []);

  const switchLang = () => setLang((current) => {
    const next = current === "zh" ? "en" : "zh";
    localStorage.setItem(langKey, next);
    return next;
  });

  const load = useCallback(async (targetInvite = invite, targetIdentity = identity) => {
    if (!targetInvite) return;
    try {
      setError("");
      const response = await fetch(`/api/books/${encodeURIComponent(targetInvite)}`, {
        cache: "no-store",
        headers: {
          "x-member-token": targetIdentity?.memberToken || "",
          "x-admin-token": targetIdentity?.adminToken || "",
        },
      });
      if (!response.ok) throw new Error(await readError(response, t.networkError));
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.networkError);
    }
  }, [identity, invite, t.networkError]);

  useEffect(() => {
    // Refresh server-backed book data when the active invite changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (invite) void load();
  }, [invite, load]);

  useEffect(() => {
    if (!invite || !identity || !data) return;
    const member = data.members.find((item) => item.id === identity.memberId);
    // Persist the current book into this browser's local recent list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentBooks(writeRecentBook({
      invite,
      identity,
      name: data.book.name,
      currency: data.book.currency,
      memberName: member?.name || "",
      updatedAt: Date.now(),
    }));
  }, [data, identity, invite]);

  const authedFetch = useCallback((url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-member-token": identity?.memberToken || "",
      "x-admin-token": identity?.adminToken || "",
      ...(init.headers || {}),
    },
  }), [identity]);

  function enterBook(nextInvite: string, nextIdentity: Identity) {
    localStorage.setItem(sessionKey(nextInvite), JSON.stringify(nextIdentity));
    setInvite(nextInvite);
    setIdentity(nextIdentity);
    setData(null);
    history.replaceState(null, "", bookPath(nextInvite));
    void load(nextInvite, nextIdentity);
  }

  function goHome() {
    setInvite("");
    setIdentity(null);
    setData(null);
    setError("");
    setTab("home");
    history.replaceState(null, "", "/");
  }

  function forgetRecentBook(targetInvite: string) {
    const next = readRecentBooks().filter((book) => book.invite !== targetInvite);
    localStorage.setItem(recentKey, JSON.stringify(next));
    localStorage.removeItem(sessionKey(targetInvite));
    setRecentBooks(next);
  }

  if (loading) return <LoadingScreen text={t.loading} />;
  if (!invite) return <Landing lang={lang} t={t} recentBooks={recentBooks} onLang={switchLang} onCreated={enterBook} onOpenRecent={(book) => enterBook(book.invite, book.identity)} onForgetRecent={forgetRecentBook} />;
  if (error && !data) return <MessageScreen title={t.cannotOpen} detail={error} action={t.backHome} onAction={goHome} />;
  if (!data) return <LoadingScreen text={t.loading} />;
  if (!identity) return <Join lang={lang} t={t} book={data.book} invite={invite} onLang={switchLang} onJoined={(next) => enterBook(invite, next)} />;

  const me = data.members.find((member) => member.id === identity.memberId);
  const memberName = (id: string) => data.members.find((member) => member.id === id)?.name || t.inactive;
  const canEdit = (expense: Expense) => Boolean(identity.adminToken) || expense.createdBy === identity.memberId;
  const activeCount = data.members.filter((m) => !m.inactive).length;
  const myBalance = me?.balance ?? 0;

  return (
    <main className="app-shell" lang={lang === "zh" ? "zh-CN" : "en"}>
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label={`${t.appName} home`}><BrandMark /><span>{t.brandText}</span></button>
        <div className="top-actions">
          <button className="ghost-button" onClick={switchLang}>{t.language}</button>
          <button className="share-button" onClick={() => setShareOpen(true)}>↗ {t.inviteFriends}</button>
        </div>
      </header>

      <section className="book-heading">
        <div>
          <p className="eyebrow">{t.travelBook}</p>
          <h1 className="book-title" title={data.book.name}><span>{data.book.name}</span></h1>
          <p className="book-meta">{activeCount} {t.membersCount} · {data.book.currency}</p>
        </div>
        <div className="user-chip"><span className="avatar small">{initials(me?.name || t.currentUser)}</span><span>{me?.name || t.currentUser}</span></div>
      </section>

      <section className="quick-stats">
        <StatCard label={t.totalSpent} value={money(data.totalSpent, data.book.currency)} />
        <StatCard label={t.myBalance} value={signedMoney(myBalance, data.book.currency)} tone={myBalance >= 0 ? "positive" : "negative"} />
        <button className="primary action-card" onClick={() => { setSelectedExpense(null); setExpenseOpen(true); }}>+ {t.addExpense}</button>
      </section>

      <nav className="tabs" aria-label="Book navigation">
        {([["home", t.overview], ["expenses", t.expenses], ["members", t.members], ["settle", t.settle]] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === "home" && <Overview t={t} data={data} currentMemberId={identity.memberId} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} onSettle={() => setTab("settle")} />}
      {tab === "expenses" && <ExpenseList t={t} data={data} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} />}
      {tab === "members" && <Members key={identity.memberId} t={t} data={data} identity={identity} invite={invite} authedFetch={authedFetch} onChanged={load} />}
      {tab === "settle" && <SettlePanel t={t} data={data} identity={identity} memberName={memberName} authedFetch={authedFetch} invite={invite} onChanged={load} />}

      <button className="fab" onClick={() => { setSelectedExpense(null); setExpenseOpen(true); }}>+ {t.addExpense}</button>

      {expenseOpen && <ExpenseModal t={t} data={data} expense={selectedExpense} currentMemberId={identity.memberId} editable={!selectedExpense || canEdit(selectedExpense)} invite={invite} authedFetch={authedFetch} onClose={() => { setExpenseOpen(false); setSelectedExpense(null); }} onChanged={async () => { await load(); setExpenseOpen(false); setSelectedExpense(null); }} />}
      {shareOpen && <ShareModal t={t} invite={invite} data={data} identity={identity} authedFetch={authedFetch} onClose={() => setShareOpen(false)} onInviteChanged={(next) => {
        localStorage.setItem(sessionKey(next), JSON.stringify(identity));
        localStorage.removeItem(sessionKey(invite));
        setInvite(next);
        history.replaceState(null, "", bookPath(next));
      }} />}
      {error && <Toast message={error} onClose={() => setError("")} />}
    </main>
  );
}

function Landing({ lang, t, recentBooks, onLang, onCreated, onOpenRecent, onForgetRecent }: { lang: Lang; t: Text; recentBooks: RecentBook[]; onLang: () => void; onCreated: (invite: string, identity: Identity) => void; onOpenRecent: (book: RecentBook) => void; onForgetRecent: (invite: string) => void }) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/books", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, nickname, currency }) });
      if (!response.ok) throw new Error(await readError(response, t.networkError));
      const result = await response.json() as Identity & { inviteToken: string; adminToken: string };
      onCreated(result.inviteToken, { memberToken: result.memberToken, memberId: result.memberId, adminToken: result.adminToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.networkError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="landing" lang={lang === "zh" ? "zh-CN" : "en"}>
      <header className="landing-nav">
        <div className="brand"><BrandMark /><span>{t.brandText}</span></div>
        <button className="ghost-button" onClick={onLang}>{t.language}</button>
      </header>
      <section className="landing-panel">
        <div className="landing-copy">
          <p className="eyebrow">{t.tagline}</p>
          <h1>{t.createBook}</h1>
          <p>{t.openInvite}</p>
          {recentBooks.length > 0 && <div className="recent-books">
            <h2>{lang === "zh" ? "最近账本" : "Recent trips"}</h2>
            <div className="recent-list">
              {recentBooks.map((book) => <article key={book.invite}>
                <button type="button" className="recent-main" onClick={() => onOpenRecent(book)}>
                  <span className="avatar small">{initials(book.name)}</span>
                  <span><b title={book.name}>{book.name}</b><small>{book.memberName || book.currency} · {new Date(book.updatedAt).toLocaleDateString()}</small></span>
                </button>
                <button type="button" className="recent-forget" onClick={() => onForgetRecent(book.invite)} aria-label={lang === "zh" ? "移除最近账本" : "Remove recent trip"}>×</button>
              </article>)}
            </div>
          </div>}
        </div>
        <form className="create-card" onSubmit={submit}>
          <label>{t.bookName}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.bookPlaceholder} maxLength={40} required /></label>
          <div className="form-row">
            <label>{t.nickname}<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.nicknamePlaceholder} maxLength={24} required /></label>
            <label>{t.currency}<select value={currency} onChange={(e) => setCurrency(e.target.value)}>{currencyOptions.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary large" disabled={busy}>{busy ? t.creating : t.create}</button>
        </form>
      </section>
    </main>
  );
}

function Join({ lang, t, book, invite, onLang, onJoined }: { lang: Lang; t: Text; book: Snapshot["book"]; invite: string; onLang: () => void; onJoined: (identity: Identity) => void }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(`/api/books/${encodeURIComponent(invite)}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) });
    if (!response.ok) {
      setError(await readError(response, t.networkError));
      setBusy(false);
      return;
    }
    onJoined(await response.json());
  }
  return (
    <main className="center-screen" lang={lang === "zh" ? "zh-CN" : "en"}>
      <button className="floating-lang" onClick={onLang}>{t.language}</button>
      <div className="join-card">
        <BrandMark big />
        <p className="eyebrow">{t.joinTitle}</p>
        <h1 className="book-title" title={book.name}><span>{book.name}</span></h1>
        <form onSubmit={submit}>
          <label>{t.nickname}<input autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.nicknamePlaceholder} maxLength={24} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary large" disabled={busy}>{busy ? t.joining : t.join}</button>
        </form>
      </div>
    </main>
  );
}

function StatCard({ label, value, tone, prefix }: { label: string; value: string; tone?: "positive" | "negative"; prefix?: string }) {
  return <article className="stat-card"><span>{label}</span><strong className={tone || ""}>{prefix ? `${prefix} ` : ""}{value}</strong></article>;
}

function Overview({ t, data, currentMemberId, memberName, onAdd, onExpense, onSettle }: { t: Text; data: Snapshot; currentMemberId: string; memberName: (id: string) => string; onAdd: () => void; onExpense: (expense: Expense) => void; onSettle: () => void }) {
  return (
    <section className="content overview-grid">
      <div className="main-column">
        <SectionTitle title={t.recent} action={t.allExpenses} onAction={() => document.querySelector<HTMLButtonElement>('.tabs button:nth-child(2)')?.click()} />
        {data.expenses.length ? <div className="expense-stack">{data.expenses.slice(0, 6).map((expense) => <ExpenseRow key={expense.id} t={t} expense={expense} data={data} memberName={memberName} onClick={() => onExpense(expense)} />)}</div> : <Empty title={t.emptyExpenses} detail={t.emptyExpensesHint} action={t.addExpense} onAction={onAdd} />}
      </div>
      <aside>
        <SectionTitle title={t.balances} />
        <div className="balance-card">{membersWithMeFirst(data.members.filter((m) => !m.inactive), currentMemberId).map((member) => <BalanceRow key={member.id} t={t} member={member} currency={data.book.currency} />)}<button className="soft-button" onClick={onSettle}>{t.viewSettle}</button></div>
      </aside>
    </section>
  );
}

function ExpenseList({ t, data, memberName, onAdd, onExpense }: { t: Text; data: Snapshot; memberName: (id: string) => string; onAdd: () => void; onExpense: (expense: Expense) => void }) {
  const groups = useMemo(() => {
    const result = new Map<string, Expense[]>();
    data.expenses.forEach((expense) => {
      const month = expense.expenseDate.slice(0, 7);
      result.set(month, [...(result.get(month) || []), expense]);
    });
    return result;
  }, [data.expenses]);
  return (
    <section className="content single">
      <div className="section-head"><h2>{t.allExpenses}</h2><button className="primary" onClick={onAdd}>+ {t.addExpense}</button></div>
      {data.expenses.length ? [...groups].map(([month, list]) => <div key={month} className="month-group"><h3>{month}<span>{money(list.reduce((sum, item) => sum + item.amount, 0), data.book.currency)}</span></h3><div className="expense-stack">{list.map((expense) => <ExpenseRow key={expense.id} t={t} expense={expense} data={data} memberName={memberName} onClick={() => onExpense(expense)} />)}</div></div>) : <Empty title={t.emptyExpenses} detail={t.emptyExpensesHint} action={t.addExpense} onAction={onAdd} />}
    </section>
  );
}

function ExpenseRow({ t, expense, data, memberName, onClick }: { t: Text; expense: Expense; data: Snapshot; memberName: (id: string) => string; onClick: () => void }) {
  const date = new Date(`${expense.expenseDate}T00:00:00`);
  const day = expense.expenseDate.slice(8, 10);
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return (
    <button className="expense-row" onClick={onClick}>
      <span className="date-tile"><b>{day}</b><small>{month}</small></span>
      <span className="expense-copy"><b>{expense.title}</b><small>{memberName(expense.paidBy)} {t.paidBy} · {expense.shares.length} {t.splitBy}</small></span>
      <strong>{money(expense.amount, data.book.currency)}</strong>
      <span className="chevron">›</span>
    </button>
  );
}

function BalanceRow({ t, member, currency }: { t: Text; member: Member; currency: string }) {
  return (
    <div className="balance-row">
      <span className="avatar">{initials(member.name)}</span>
      <div><b>{member.name}</b><small>{t.paid} {money(member.paid, currency)} · {t.owed} {money(member.owed, currency)}</small></div>
      <strong className={member.balance >= 0 ? "positive" : "negative"}>{signedMoney(member.balance, currency)}</strong>
    </div>
  );
}

function Members({ t, data, identity, invite, authedFetch, onChanged }: { t: Text; data: Snapshot; identity: Identity; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const me = data.members.find((member) => member.id === identity.memberId);
  const [paymentMethod, setPaymentMethod] = useState(me?.paymentMethod || "zelle");
  const [paymentAccount, setPaymentAccount] = useState(me?.paymentAccount || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const sortedMembers = membersWithMeFirst(data.members, identity.memberId);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!me) return;
    setSavingProfile(true);
    const response = await authedFetch(`/api/books/${invite}/members/${me.id}`, { method: "PATCH", body: JSON.stringify({ action: "profile", paymentMethod, paymentAccount }) });
    setSavingProfile(false);
    if (!response.ok) { setMessage(await readError(response, t.networkError)); return; }
    await onChanged();
    setMessage(t.copied);
  }
  async function action(member: Member, type: "deactivate" | "reactivate" | "regenerate") {
    const response = await authedFetch(`/api/books/${invite}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ action: type }) });
    if (!response.ok) { setMessage(await readError(response, t.networkError)); return; }
    const result = await response.json() as { memberToken?: string; memberId?: string };
    if (type === "regenerate" && result.memberToken) {
      const url = `${location.origin}${bookPath(invite)}?member=${encodeURIComponent(result.memberToken)}&memberId=${encodeURIComponent(member.id)}`;
      await navigator.clipboard.writeText(url);
      setMessage(t.memberLinkCopied);
    } else {
      await onChanged();
      setMessage(type === "deactivate" ? t.inactive : t.reactivate);
    }
  }
  return (
    <section className="content single">
      <div className="section-head"><h2>{t.members}</h2><span className="count-badge">{data.members.filter((m) => !m.inactive).length}</span></div>
      {me && <form className="payment-profile" onSubmit={saveProfile}>
        <div><h3>{t.paymentProfile}</h3><p>{t.paymentProfileHint}</p></div>
        <label>{t.paymentMethod}<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map((method) => <option value={method.id} key={method.id}>{method.label}</option>)}</select></label>
        <label>{t.paymentAccount}<input value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} placeholder="@name / phone / email" maxLength={80} /></label>
        <button className="primary" disabled={savingProfile}>{savingProfile ? t.saving : t.save}</button>
      </form>}
      <div className="member-grid">{sortedMembers.map((member) => <article className={`member-card ${member.inactive ? "muted" : ""}`} key={member.id}>
        <div className="member-top"><span className="avatar large-avatar">{initials(member.name)}</span><div><h3>{member.name}{member.id === identity.memberId && <em>{t.currentUser}</em>}</h3><p>{member.isCreator ? t.creator : member.inactive ? t.inactive : t.member}</p></div></div>
        <div className="mini-stats"><span>{t.paid}<b>{money(member.paid, data.book.currency)}</b></span><span>{t.owed}<b>{money(member.owed, data.book.currency)}</b></span></div>
        <div className={`net ${member.balance >= 0 ? "positive" : "negative"}`}><span>{t.net}</span><b>{signedMoney(member.balance, data.book.currency)}</b></div>
        {identity.adminToken && !member.isCreator && <div className="member-actions"><button onClick={() => action(member, "regenerate")}>{t.regenerate}</button><button onClick={() => action(member, member.inactive ? "reactivate" : "deactivate")}>{member.inactive ? t.reactivate : t.deactivate}</button></div>}
      </article>)}</div>
      {message && <Toast message={message} onClose={() => setMessage("")} />}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Settle({ t, data, memberName, authedFetch, invite, onChanged }: { t: Text; data: Snapshot; memberName: (id: string) => string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; invite: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function settle(item: Snapshot["suggestions"][number]) {
    const key = `${item.fromMemberId}-${item.toMemberId}`;
    setBusy(key);
    setError("");
    const response = await authedFetch(`/api/books/${invite}/settlements`, { method: "POST", body: JSON.stringify(item) });
    if (!response.ok) setError(await readError(response, t.networkError)); else await onChanged();
    setBusy("");
  }
  return (
    <section className="content settle-layout">
      <div>
        <h2>{t.settlements}</h2>
        <p className="section-lead">{t.settleHint}</p>
        {data.suggestions.length ? <div className="settlement-list">{data.suggestions.map((item) => {
          const key = `${item.fromMemberId}-${item.toMemberId}`;
          return <article key={key}><span className="avatar">{initials(memberName(item.fromMemberId))}</span><div><p><b>{memberName(item.fromMemberId)}</b><span>→</span><b>{memberName(item.toMemberId)}</b></p><strong>{money(item.amount, data.book.currency)}</strong></div><button disabled={busy === key} onClick={() => settle(item)}>{t.markPaid}</button></article>;
        })}</div> : <div className="all-clear"><h3>{t.allClear}</h3><p>{t.allClearHint}</p></div>}
        {error && <p className="form-error">{error}</p>}
      </div>
      {data.settlements.length > 0 && <div className="history"><SectionTitle title={t.history} />{data.settlements.map((item) => <p key={item.id}><span>{memberName(item.fromMemberId)} → {memberName(item.toMemberId)}</span><b>{money(item.amount, data.book.currency)}</b></p>)}</div>}
    </section>
  );
}

const paymentMethods = [
  { id: "zelle", label: "Zelle", icon: "Z" },
  { id: "venmo", label: "Venmo", icon: "V" },
  { id: "apple-cash", label: "Apple Cash", icon: "" },
  { id: "cash", label: "Cash", icon: "$" },
  { id: "other", label: "Other", icon: "…" },
] as const;

function SettlePanel({ t, data, identity, memberName, authedFetch, invite, onChanged }: { t: Text; data: Snapshot; identity: Identity; memberName: (id: string) => string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; invite: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [methods, setMethods] = useState<Record<string, string>>({});
  const memberById = (id: string) => data.members.find((member) => member.id === id);
  const methodMeta = (id?: string | null) => paymentMethods.find((item) => item.id === id) || paymentMethods[paymentMethods.length - 1];
  async function settle(item: Snapshot["suggestions"][number]) {
    const key = `${item.fromMemberId}-${item.toMemberId}`;
    const recipient = memberById(item.toMemberId);
    const fallbackMethod = recipient?.paymentMethod || "zelle";
    setBusy(key);
    setError("");
    const response = await authedFetch(`/api/books/${invite}/settlements`, { method: "POST", body: JSON.stringify({ ...item, method: methods[key] || fallbackMethod }) });
    if (!response.ok) setError(await readError(response, t.networkError)); else await onChanged();
    setBusy("");
  }
  async function undo(item: Settlement) {
    setBusy(item.id);
    setError("");
    const response = await authedFetch(`/api/books/${invite}/settlements`, { method: "DELETE", body: JSON.stringify({ settlementId: item.id }) });
    if (!response.ok) setError(await readError(response, t.networkError)); else await onChanged();
    setBusy("");
  }
  return (
    <section className="content settle-layout">
      <div>
        <h2>{t.settle}</h2>
        {data.suggestions.length ? <div className="settlement-list">{data.suggestions.map((item) => {
          const key = `${item.fromMemberId}-${item.toMemberId}`;
          const recipient = memberById(item.toMemberId);
          const selectedMethod = methods[key] || recipient?.paymentMethod || "zelle";
          const selectedMeta = methodMeta(selectedMethod);
          const paymentLine = recipient?.paymentMethod || recipient?.paymentAccount ? `${selectedMeta.label}${recipient?.paymentAccount ? ` · ${recipient.paymentAccount}` : ""}` : t.noPaymentAccount;
          return <article className="settle-row" key={key}><span className="avatar">{initials(memberName(item.fromMemberId))}</span><div className="settle-main"><p><b>{memberName(item.fromMemberId)}</b><span>→</span><b>{memberName(item.toMemberId)}</b></p><strong>{money(item.amount, data.book.currency)}</strong><small className="payment-note"><i className="method-icon">{selectedMeta.icon}</i>{paymentLine}</small><div className="method-pills">{paymentMethods.map((method) => <button type="button" key={method.id} className={selectedMethod === method.id ? "active" : ""} onClick={() => setMethods((current) => ({ ...current, [key]: method.id }))}><i>{method.icon}</i>{method.label}</button>)}</div></div><button disabled={busy === key} onClick={() => settle(item)}>{t.markPaid}</button></article>;
        })}</div> : <div className="all-clear compact"><h3>{t.allClear}</h3><p>{t.allClearHint}</p></div>}
        {error && <p className="form-error">{error}</p>}
      </div>
      {data.settlements.length > 0 && <div className="history"><SectionTitle title={t.history} />{data.settlements.map((item) => {
        const method = methodMeta(item.method);
        const canUndo = item.createdBy === identity.memberId || Boolean(identity.adminToken);
        return <p key={item.id} className="history-row"><span><i className="method-icon">{method.icon}</i>{memberName(item.fromMemberId)} → {memberName(item.toMemberId)}<small>{method.label}</small></span><b>{money(item.amount, data.book.currency)}</b>{canUndo && <button type="button" disabled={busy === item.id} onClick={() => undo(item)}>{t.cancel}</button>}</p>;
      })}</div>}
    </section>
  );
}

function ExpenseModal({ t, data, expense, currentMemberId, editable, invite, authedFetch, onClose, onChanged }: { t: Text; data: Snapshot; expense: Expense | null; currentMemberId: string; editable: boolean; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onChanged: () => Promise<void> }) {
  const activeMembers = data.members.filter((member) => !member.inactive);
  const [title, setTitle] = useState(expense?.title || "");
  const [amountInput, setAmountInput] = useState(expense ? inputFromMinor(expense.amount, data.book.currency) : "");
  const defaultPaidBy = activeMembers.some((member) => member.id === currentMemberId) ? currentMemberId : activeMembers[0]?.id || "";
  const [paidBy, setPaidBy] = useState(expense?.paidBy || defaultPaidBy);
  const [date, setDate] = useState(expense?.expenseDate || today());
  const [mode, setMode] = useState<"equal" | "custom">(expense && !isEqualSplitExpense(expense) ? "custom" : "equal");
  const [selected, setSelected] = useState<string[]>(expense ? expense.shares.map((share) => share.memberId) : activeMembers.map((member) => member.id));
  const [custom, setCustom] = useState<Record<string, string>>(() => Object.fromEntries(expense?.shares.map((share) => [share.memberId, inputFromMinor(share.amount, data.book.currency)]) || []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = minorFromInput(amountInput, data.book.currency);
  const equalCustom = useCallback((ids: string[], nextTotal = total) => Object.fromEntries(splitEqually(nextTotal, ids).map((share) => [share.memberId, inputFromMinor(share.amount, data.book.currency)])), [data.book.currency, total]);
  const customMatchesEqual = useCallback((ids: string[], nextTotal = total) => {
    const expected = equalCustom(ids, nextTotal);
    return ids.every((id) => (custom[id] || "") === (expected[id] || ""));
  }, [custom, equalCustom, total]);
  const computedShares = useMemo(() => {
    if (!selected.length) return [];
    if (mode === "custom") return selected.map((id) => ({ memberId: id, amount: minorFromInput(custom[id] || "", data.book.currency) }));
    return splitEqually(total, selected);
  }, [selected, mode, custom, total, data.book.currency]);
  const shareTotal = computedShares.reduce((sum, share) => sum + share.amount, 0);
  function toggle(id: string) {
    if (!editable) return;
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (mode === "custom" && customMatchesEqual(current)) setCustom(equalCustom(next));
      return next;
    });
  }
  function switchMode(nextMode: "equal" | "custom") {
    setMode(nextMode);
    if (nextMode === "custom") {
      setCustom(equalCustom(selected));
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    setBusy(true);
    setError("");
    if (!selected.length) { setError(t.selectOne); setBusy(false); return; }
    if (!total || shareTotal !== total || computedShares.some((share) => share.amount <= 0)) { setError(t.invalidSplit); setBusy(false); return; }
    const url = expense ? `/api/books/${invite}/expenses/${expense.id}` : `/api/books/${invite}/expenses`;
    const response = await authedFetch(url, { method: expense ? "PATCH" : "POST", body: JSON.stringify({ title, amount: total, paidBy, expenseDate: date, shares: computedShares }) });
    if (!response.ok) setError(await readError(response, t.networkError)); else await onChanged();
    setBusy(false);
  }
  async function remove() {
    if (!expense || !confirm(t.confirmDelete)) return;
    setBusy(true);
    const response = await authedFetch(`/api/books/${invite}/expenses/${expense.id}`, { method: "DELETE" });
    if (!response.ok) setError(await readError(response, t.networkError)); else await onChanged();
    setBusy(false);
  }
  return (
    <Modal onClose={onClose}>
      <form className="expense-form" onSubmit={submit}>
        <div className="modal-title"><div><p className="eyebrow">{expense ? t.details : t.newExpense}</p><h2>{expense ? expense.title : t.addExpense}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
        {!editable && <div className="notice">{t.readonly}</div>}
        <fieldset disabled={!editable || busy}>
          <label>{t.expenseTitle}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required /></label>
          <div className="form-row"><label>{t.amount}<div className="money-input"><span>{data.book.currency}</span><input inputMode="decimal" value={amountInput} onChange={(e) => {
            setAmountInput(e.target.value);
            if (mode === "custom" && customMatchesEqual(selected)) setCustom(equalCustom(selected, minorFromInput(e.target.value, data.book.currency)));
          }} placeholder="0.00" required /></div></label><DateField t={t} value={date} onChange={setDate} disabled={!editable || busy} /></div>
          <label>{t.payer}<select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{activeMembers.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          <div className="split-heading"><span>{t.participants}</span><div className="segmented"><button type="button" className={mode === "equal" ? "active" : ""} onClick={() => switchMode("equal")}>{t.equal}</button><button type="button" className={mode === "custom" ? "active" : ""} onClick={() => switchMode("custom")}>{t.custom}</button></div></div>
          <div className="participant-list">{activeMembers.map((member) => {
            const isSelected = selected.includes(member.id);
            const share = computedShares.find((item) => item.memberId === member.id)?.amount || 0;
            return <div className={isSelected ? "selected" : ""} key={member.id}><button type="button" className="member-pick" onClick={() => toggle(member.id)}><span className="check">{isSelected ? "✓" : ""}</span><span className="avatar small">{initials(member.name)}</span><b>{member.name}</b></button>{isSelected && (mode === "custom" ? <input className="share-input" inputMode="decimal" aria-label={`${member.name} ${t.amount}`} value={custom[member.id] || ""} onChange={(e) => setCustom({ ...custom, [member.id]: e.target.value })} placeholder="0.00" /> : <strong>{money(share, data.book.currency)}</strong>)}</div>;
          })}</div>
          {mode === "custom" && <p className={`sum-line ${shareTotal === total && total > 0 ? "good" : ""}`}>{t.allocated} {money(shareTotal, data.book.currency)} / {money(total, data.book.currency)}</p>}
        </fieldset>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">{expense && editable && <button type="button" className="danger" onClick={remove} disabled={busy}>{t.delete}</button>}<span /><button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>{editable && <button className="primary" disabled={busy}>{busy ? t.saving : t.save}</button>}</div>
      </form>
    </Modal>
  );
}

function DateField({ t, value, onChange, disabled }: { t: Text; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateValue(value));
  const selectedDate = parseDateValue(value);
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const isChinese = t.language === "English";
  function choose(day: Date) {
    onChange(toDateValue(day));
    setViewDate(day);
    setOpen(false);
  }
  function moveMonth(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  }
  return (
    <label className="date-field">{t.date}
      <button type="button" className="date-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span>{value}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && <div className="date-popover">
        <div className="date-popover-head">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
          <strong>{monthLabel(viewDate)}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
        </div>
        <div className="date-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="date-grid">{days.map((day) => {
          const dateValue = toDateValue(day);
          const muted = day.getMonth() !== viewDate.getMonth();
          const selected = dateValue === toDateValue(selectedDate);
          return <button type="button" key={dateValue} className={`${muted ? "muted" : ""} ${selected ? "selected" : ""}`} onClick={() => choose(day)}>{day.getDate()}</button>;
        })}</div>
        <button type="button" className="date-today" onClick={() => choose(new Date())}>{isChinese ? "今天" : "Today"}</button>
      </div>}
    </label>
  );
}

function ShareModal({ t, invite, data, identity, authedFetch, onClose, onInviteChanged }: { t: Text; invite: string; data: Snapshot; identity: Identity; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onInviteChanged: (invite: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const url = typeof location === "undefined" ? "" : `${location.origin}${bookPath(invite)}`;
  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  async function reset() {
    if (!confirm(t.confirmReset)) return;
    const response = await authedFetch(`/api/books/${invite}/reset-invite`, { method: "POST", body: "{}" });
    if (!response.ok) { setError(await readError(response, t.networkError)); return; }
    const result = await response.json() as { inviteToken: string };
    onInviteChanged(result.inviteToken);
    setError(t.linkChanged);
  }
  return (
    <Modal onClose={onClose}>
      <div className="share-modal">
        <div className="modal-title"><div><p className="eyebrow">{t.shareTitle}</p><h2>{data.book.name}</h2></div><button className="close" onClick={onClose}>×</button></div>
        <p>{t.shareBody}</p>
        <div className="copy-box"><input readOnly value={url} /><button onClick={copyLink}>{copied ? t.copied : t.copyLink}</button></div>
        {identity.adminToken && <button className="text-danger" onClick={reset}>{t.resetInvite}</button>}
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-panel" role="dialog" aria-modal="true">{children}</div></div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onAction}>{action}</button>}</div>;
}

function Empty({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return <div className="empty"><h3>{title}</h3><p>{detail}</p><button onClick={onAction}>+ {action}</button></div>;
}

function LoadingScreen({ text }: { text: string }) {
  return <main className="center-screen"><div className="loader"><BrandMark big /><p>{text}</p></div></main>;
}

function MessageScreen({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return <main className="center-screen"><div className="join-card"><BrandMark big /><h1>{title}</h1><p>{detail}</p><button className="primary large" onClick={onAction}>{action}</button></div></main>;
}

function BrandMark({ big = false }: { big?: boolean }) {
  return <span className={`brand-mark${big ? " big" : ""}`} aria-hidden="true" />;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [onClose]);
  return <button className="toast" onClick={onClose}>{message}<span>×</span></button>;
}
