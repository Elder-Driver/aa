"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { splitEqually } from "../lib/calculations";

type Lang = "zh" | "en";
type Member = { id: string; name: string; isCreator: boolean; inactive: boolean; paid: number; owed: number; sent: number; received: number; balance: number };
type ExpenseShare = { id: string; expenseId: string; memberId: string; amount: number };
type Expense = { id: string; title: string; amount: number; paidBy: string; createdBy: string; expenseDate: string; createdAt: string; shares: ExpenseShare[] };
type Settlement = { id: string; fromMemberId: string; toMemberId: string; amount: number; createdAt: string };
type Snapshot = { book: { id: string; name: string; currency: string; createdAt: string }; members: Member[]; expenses: Expense[]; settlements: Settlement[]; totalSpent: number; suggestions: Array<{ fromMemberId: string; toMemberId: string; amount: number }> };
type Identity = { memberToken: string; memberId: string; adminToken?: string };
type Tab = "home" | "expenses" | "members" | "settle";

const copy = {
  zh: {
    appName: "分账搭子",
    tagline: "旅行分账，不绕弯",
    createBook: "新建账本",
    bookName: "账本名称",
    bookPlaceholder: "例如：New York weekend",
    nickname: "你的昵称",
    nicknamePlaceholder: "朋友认得出的名字",
    currency: "币种",
    create: "创建账本",
    creating: "创建中...",
    openInvite: "已有邀请链接？直接打开链接即可加入。",
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
    paid: "已付",
    owes: "应付",
    receives: "应收",
    owed: "应承担",
    net: "净额",
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
    appName: "SplitPack",
    tagline: "Split trips without the spreadsheet",
    createBook: "New trip",
    bookName: "Trip name",
    bookPlaceholder: "e.g. New York weekend",
    nickname: "Your name",
    nicknamePlaceholder: "A name friends recognize",
    currency: "Currency",
    create: "Create trip",
    creating: "Creating...",
    openInvite: "Have an invite? Open the link to join.",
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
const today = () => new Date().toISOString().slice(0, 10);
const sessionKey = (invite: string) => `splitpack:${invite}`;

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

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return data.error || fallback;
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

  useEffect(() => {
    const storedLang = localStorage.getItem(langKey);
    // Browser language preference and invite identity are restored at hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedLang === "zh" || storedLang === "en") setLang(storedLang);
    const params = new URLSearchParams(window.location.search);
    const foundInvite = params.get("book") || "";
    const incomingMember = params.get("member");
    const incomingMemberId = params.get("memberId");
    if (foundInvite && incomingMember && incomingMemberId) {
      localStorage.setItem(sessionKey(foundInvite), JSON.stringify({ memberToken: incomingMember, memberId: incomingMemberId }));
      params.delete("member");
      params.delete("memberId");
      history.replaceState(null, "", params.toString() ? `/?${params.toString()}` : "/");
    }
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

  const load = useCallback(async () => {
    if (!invite) return;
    try {
      setError("");
      const response = await fetch(`/api/books/${encodeURIComponent(invite)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response, t.networkError));
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.networkError);
    }
  }, [invite, t.networkError]);

  useEffect(() => {
    // Refresh server-backed book data when the active invite changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (invite) void load();
  }, [invite, load]);

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
    history.replaceState(null, "", `/?book=${encodeURIComponent(nextInvite)}`);
  }

  if (loading) return <LoadingScreen text={t.loading} />;
  if (!invite) return <Landing lang={lang} t={t} onLang={switchLang} onCreated={enterBook} />;
  if (error && !data) return <MessageScreen title={t.cannotOpen} detail={error} action={t.backHome} onAction={() => { history.replaceState(null, "", "/"); setInvite(""); setError(""); }} />;
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
        <button className="brand" onClick={() => setTab("home")} aria-label={t.appName}><span className="brand-mark">SP</span><span>{t.appName}</span></button>
        <div className="top-actions">
          <button className="ghost-button" onClick={switchLang}>{t.language}</button>
          <button className="share-button" onClick={() => setShareOpen(true)}>↗ {t.inviteFriends}</button>
        </div>
      </header>

      <section className="book-heading">
        <div>
          <p className="eyebrow">{t.travelBook}</p>
          <h1>{data.book.name}</h1>
          <p className="book-meta">{activeCount} {t.membersCount} · {data.book.currency}</p>
        </div>
        <div className="user-chip"><span className="avatar small">{initials(me?.name || t.currentUser)}</span><span>{me?.name || t.currentUser}</span></div>
      </section>

      <section className="quick-stats">
        <StatCard label={t.totalSpent} value={money(data.totalSpent, data.book.currency)} />
        <StatCard label={t.myBalance} value={money(Math.abs(myBalance), data.book.currency)} tone={myBalance >= 0 ? "positive" : "negative"} prefix={myBalance >= 0 ? t.receives : t.owes} />
        <button className="primary action-card" onClick={() => { setSelectedExpense(null); setExpenseOpen(true); }}>+ {t.addExpense}</button>
      </section>

      <nav className="tabs" aria-label="Book navigation">
        {([["home", t.overview], ["expenses", t.expenses], ["members", t.members], ["settle", t.settle]] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === "home" && <Overview t={t} data={data} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} onSettle={() => setTab("settle")} />}
      {tab === "expenses" && <ExpenseList t={t} data={data} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} />}
      {tab === "members" && <Members t={t} data={data} identity={identity} invite={invite} authedFetch={authedFetch} onChanged={load} />}
      {tab === "settle" && <Settle t={t} data={data} memberName={memberName} authedFetch={authedFetch} invite={invite} onChanged={load} />}

      <button className="fab" onClick={() => { setSelectedExpense(null); setExpenseOpen(true); }}>+ {t.addExpense}</button>

      {expenseOpen && <ExpenseModal t={t} data={data} expense={selectedExpense} editable={!selectedExpense || canEdit(selectedExpense)} invite={invite} authedFetch={authedFetch} onClose={() => { setExpenseOpen(false); setSelectedExpense(null); }} onChanged={async () => { await load(); setExpenseOpen(false); setSelectedExpense(null); }} />}
      {shareOpen && <ShareModal t={t} invite={invite} data={data} identity={identity} authedFetch={authedFetch} onClose={() => setShareOpen(false)} onInviteChanged={(next) => {
        localStorage.setItem(sessionKey(next), JSON.stringify(identity));
        localStorage.removeItem(sessionKey(invite));
        setInvite(next);
        history.replaceState(null, "", `/?book=${encodeURIComponent(next)}`);
      }} />}
      {error && <Toast message={error} onClose={() => setError("")} />}
    </main>
  );
}

function Landing({ lang, t, onLang, onCreated }: { lang: Lang; t: Text; onLang: () => void; onCreated: (invite: string, identity: Identity) => void }) {
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
        <div className="brand"><span className="brand-mark">SP</span><span>{t.appName}</span></div>
        <button className="ghost-button" onClick={onLang}>{t.language}</button>
      </header>
      <section className="landing-panel">
        <div className="landing-copy">
          <p className="eyebrow">{t.tagline}</p>
          <h1>{t.createBook}</h1>
          <p>{t.openInvite}</p>
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
        <span className="brand-mark big">SP</span>
        <p className="eyebrow">{t.joinTitle}</p>
        <h1>{book.name}</h1>
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

function Overview({ t, data, memberName, onAdd, onExpense, onSettle }: { t: Text; data: Snapshot; memberName: (id: string) => string; onAdd: () => void; onExpense: (expense: Expense) => void; onSettle: () => void }) {
  return (
    <section className="content overview-grid">
      <div className="main-column">
        <SectionTitle title={t.recent} action={t.allExpenses} onAction={() => document.querySelector<HTMLButtonElement>('.tabs button:nth-child(2)')?.click()} />
        {data.expenses.length ? <div className="expense-stack">{data.expenses.slice(0, 6).map((expense) => <ExpenseRow key={expense.id} t={t} expense={expense} data={data} memberName={memberName} onClick={() => onExpense(expense)} />)}</div> : <Empty title={t.emptyExpenses} detail={t.emptyExpensesHint} action={t.addExpense} onAction={onAdd} />}
      </div>
      <aside>
        <SectionTitle title={t.balances} />
        <div className="balance-card">{data.members.filter((m) => !m.inactive).map((member) => <BalanceRow key={member.id} t={t} member={member} currency={data.book.currency} />)}<button className="soft-button" onClick={onSettle}>{t.viewSettle}</button></div>
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
      <strong className={member.balance >= 0 ? "positive" : "negative"}>{member.balance >= 0 ? t.receives : t.owes} {money(Math.abs(member.balance), currency)}</strong>
    </div>
  );
}

function Members({ t, data, identity, invite, authedFetch, onChanged }: { t: Text; data: Snapshot; identity: Identity; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  async function action(member: Member, type: "deactivate" | "reactivate" | "regenerate") {
    const response = await authedFetch(`/api/books/${invite}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ action: type }) });
    if (!response.ok) { setMessage(await readError(response, t.networkError)); return; }
    const result = await response.json() as { memberToken?: string; memberId?: string };
    if (type === "regenerate" && result.memberToken) {
      const url = `${location.origin}/?book=${encodeURIComponent(invite)}&member=${encodeURIComponent(result.memberToken)}&memberId=${encodeURIComponent(member.id)}`;
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
      <div className="member-grid">{data.members.map((member) => <article className={`member-card ${member.inactive ? "muted" : ""}`} key={member.id}>
        <div className="member-top"><span className="avatar large-avatar">{initials(member.name)}</span><div><h3>{member.name}{member.id === identity.memberId && <em>{t.currentUser}</em>}</h3><p>{member.isCreator ? t.creator : member.inactive ? t.inactive : t.member}</p></div></div>
        <div className="mini-stats"><span>{t.paid}<b>{money(member.paid, data.book.currency)}</b></span><span>{t.owed}<b>{money(member.owed, data.book.currency)}</b></span></div>
        <div className={`net ${member.balance >= 0 ? "positive" : "negative"}`}><span>{member.balance >= 0 ? t.receives : t.owes}</span><b>{money(Math.abs(member.balance), data.book.currency)}</b></div>
        {identity.adminToken && !member.isCreator && <div className="member-actions"><button onClick={() => action(member, "regenerate")}>{t.regenerate}</button><button onClick={() => action(member, member.inactive ? "reactivate" : "deactivate")}>{member.inactive ? t.reactivate : t.deactivate}</button></div>}
      </article>)}</div>
      {message && <Toast message={message} onClose={() => setMessage("")} />}
    </section>
  );
}

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

function ExpenseModal({ t, data, expense, editable, invite, authedFetch, onClose, onChanged }: { t: Text; data: Snapshot; expense: Expense | null; editable: boolean; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onChanged: () => Promise<void> }) {
  const activeMembers = data.members.filter((member) => !member.inactive);
  const [title, setTitle] = useState(expense?.title || "");
  const [amountInput, setAmountInput] = useState(expense ? inputFromMinor(expense.amount, data.book.currency) : "");
  const [paidBy, setPaidBy] = useState(expense?.paidBy || activeMembers[0]?.id || "");
  const [date, setDate] = useState(expense?.expenseDate || today());
  const [mode, setMode] = useState<"equal" | "custom">(expense ? "custom" : "equal");
  const [selected, setSelected] = useState<string[]>(expense ? expense.shares.map((share) => share.memberId) : activeMembers.map((member) => member.id));
  const [custom, setCustom] = useState<Record<string, string>>(() => Object.fromEntries(expense?.shares.map((share) => [share.memberId, inputFromMinor(share.amount, data.book.currency)]) || []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = minorFromInput(amountInput, data.book.currency);
  const computedShares = useMemo(() => {
    if (!selected.length) return [];
    if (mode === "custom") return selected.map((id) => ({ memberId: id, amount: minorFromInput(custom[id] || "", data.book.currency) }));
    return splitEqually(total, selected);
  }, [selected, mode, custom, total, data.book.currency]);
  const shareTotal = computedShares.reduce((sum, share) => sum + share.amount, 0);
  function toggle(id: string) {
    if (!editable) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
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
          <div className="form-row"><label>{t.amount}<div className="money-input"><span>{data.book.currency}</span><input inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" required /></div></label><label>{t.date}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label></div>
          <label>{t.payer}<select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{activeMembers.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          <div className="split-heading"><span>{t.participants}</span><div className="segmented"><button type="button" className={mode === "equal" ? "active" : ""} onClick={() => setMode("equal")}>{t.equal}</button><button type="button" className={mode === "custom" ? "active" : ""} onClick={() => setMode("custom")}>{t.custom}</button></div></div>
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

function ShareModal({ t, invite, data, identity, authedFetch, onClose, onInviteChanged }: { t: Text; invite: string; data: Snapshot; identity: Identity; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onInviteChanged: (invite: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const url = typeof location === "undefined" ? "" : `${location.origin}/?book=${encodeURIComponent(invite)}`;
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
  return <main className="center-screen"><div className="loader"><span className="brand-mark big">SP</span><p>{text}</p></div></main>;
}

function MessageScreen({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return <main className="center-screen"><div className="join-card"><span className="brand-mark big">SP</span><h1>{title}</h1><p>{detail}</p><button className="primary large" onClick={onAction}>{action}</button></div></main>;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [onClose]);
  return <button className="toast" onClick={onClose}>{message}<span>×</span></button>;
}
