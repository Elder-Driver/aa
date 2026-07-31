"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { splitEqually } from "../lib/calculations";

type Member = { id: string; name: string; isCreator: boolean; inactive: boolean; paid: number; owed: number; sent: number; received: number; balance: number };
type ExpenseShare = { id: string; expenseId: string; memberId: string; amount: number };
type Expense = { id: string; title: string; amount: number; paidBy: string; createdBy: string; expenseDate: string; createdAt: string; shares: ExpenseShare[] };
type Settlement = { id: string; fromMemberId: string; toMemberId: string; amount: number; createdAt: string };
type Snapshot = { book: { id: string; name: string; currency: string; createdAt: string }; members: Member[]; expenses: Expense[]; settlements: Settlement[]; totalSpent: number; suggestions: Array<{ fromMemberId: string; toMemberId: string; amount: number }> };
type Identity = { memberToken: string; memberId: string; adminToken?: string };
type Tab = "home" | "expenses" | "members" | "settle";

const currencyOptions = [
  ["CNY", "人民币 ¥"], ["USD", "美元 $"], ["EUR", "欧元 €"], ["JPY", "日元 ¥"],
  ["HKD", "港币 HK$"], ["TWD", "新台币 NT$"], ["KRW", "韩元 ₩"], ["THB", "泰铢 ฿"],
];
const zeroDecimal = new Set(["JPY", "KRW"]);
const today = () => new Date().toISOString().slice(0, 10);
const sessionKey = (invite: string) => `yiqi-aa:${invite}`;

function minorFromInput(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * (zeroDecimal.has(currency) ? 1 : 100));
}

function inputFromMinor(value: number, currency: string) {
  const divisor = zeroDecimal.has(currency) ? 1 : 100;
  return (value / divisor).toFixed(zeroDecimal.has(currency) ? 0 : 2);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, minimumFractionDigits: zeroDecimal.has(currency) ? 0 : 2 }).format(value / (zeroDecimal.has(currency) ? 1 : 100));
}

function initials(name: string) { return name.trim().slice(0, 1).toUpperCase() || "友"; }

async function readError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string };
  return data.error || "网络开小差了，请重试";
}

export function AAApp() {
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
    const params = new URLSearchParams(window.location.search);
    const foundInvite = params.get("book") || "";
    const incomingMember = params.get("member");
    const incomingMemberId = params.get("memberId");
    if (foundInvite && incomingMember && incomingMemberId) {
      const imported = { memberToken: incomingMember, memberId: incomingMemberId };
      localStorage.setItem(sessionKey(foundInvite), JSON.stringify(imported));
      params.delete("member"); params.delete("memberId");
      history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
    }
    // Reading the URL and device identity is the intended client hydration boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvite(foundInvite);
    if (foundInvite) {
      try { setIdentity(JSON.parse(localStorage.getItem(sessionKey(foundInvite)) || "null")); } catch { setIdentity(null); }
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!invite) return;
    try {
      setError("");
      const response = await fetch(`/api/books/${encodeURIComponent(invite)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      setData(await response.json());
    } catch (err) { setError(err instanceof Error ? err.message : "无法打开账本"); }
  }, [invite]);

  useEffect(() => {
    // Refresh server-backed state whenever the active invitation changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (invite) void load();
  }, [invite, load]);

  const authedFetch = useCallback((url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: { "content-type": "application/json", "x-member-token": identity?.memberToken || "", "x-admin-token": identity?.adminToken || "", ...(init.headers || {}) },
  }), [identity]);

  function enterBook(nextInvite: string, nextIdentity: Identity) {
    localStorage.setItem(sessionKey(nextInvite), JSON.stringify(nextIdentity));
    setInvite(nextInvite); setIdentity(nextIdentity); setData(null);
    history.replaceState(null, "", `/?book=${encodeURIComponent(nextInvite)}`);
  }

  if (loading) return <LoadingScreen />;
  if (!invite) return <Landing onCreated={enterBook} />;
  if (error && !data) return <MessageScreen title="这个链接没能打开" detail={error} action="返回首页" onAction={() => { history.replaceState(null, "", "/"); setInvite(""); setError(""); }} />;
  if (!data) return <LoadingScreen />;
  if (!identity) return <Join book={data.book} invite={invite} onJoined={(next) => enterBook(invite, next)} />;

  const me = data.members.find((member) => member.id === identity.memberId);
  const memberName = (id: string) => data.members.find((member) => member.id === id)?.name || "已停用成员";
  const canEdit = (expense: Expense) => Boolean(identity.adminToken) || expense.createdBy === identity.memberId;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab("home")} aria-label="回到账本首页"><span className="brand-mark">AA</span><span>一起AA</span></button>
        <button className="share-button" onClick={() => setShareOpen(true)}><Icon name="share" />邀请朋友</button>
      </header>

      <section className="book-heading">
        <div><p className="eyebrow">旅行账本</p><h1>{data.book.name}</h1><p className="book-meta">{data.members.filter((m) => !m.inactive).length} 位成员 · {data.book.currency}</p></div>
        <div className="user-chip"><span className="avatar small">{initials(me?.name || "我")}</span><span>{me?.name || "我"}</span></div>
      </section>

      <nav className="tabs" aria-label="账本导航">
        {([ ["home", "概览"], ["expenses", "账目"], ["members", "成员"], ["settle", "结算"] ] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === "home" && <Overview data={data} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} onSettle={() => setTab("settle")} />}
      {tab === "expenses" && <ExpenseList data={data} memberName={memberName} onAdd={() => { setSelectedExpense(null); setExpenseOpen(true); }} onExpense={(expense) => { setSelectedExpense(expense); setExpenseOpen(true); }} />}
      {tab === "members" && <Members data={data} identity={identity} invite={invite} authedFetch={authedFetch} onChanged={load} />}
      {tab === "settle" && <Settle data={data} memberName={memberName} authedFetch={authedFetch} invite={invite} onChanged={load} />}

      <button className="fab" onClick={() => { setSelectedExpense(null); setExpenseOpen(true); }}><span>＋</span>记一笔</button>

      {expenseOpen && <ExpenseModal data={data} expense={selectedExpense} editable={!selectedExpense || canEdit(selectedExpense)} invite={invite} authedFetch={authedFetch} onClose={() => { setExpenseOpen(false); setSelectedExpense(null); }} onChanged={async () => { await load(); setExpenseOpen(false); setSelectedExpense(null); }} />}
      {shareOpen && <ShareModal invite={invite} data={data} identity={identity} authedFetch={authedFetch} onClose={() => setShareOpen(false)} onInviteChanged={(next) => {
        localStorage.setItem(sessionKey(next), JSON.stringify(identity)); localStorage.removeItem(sessionKey(invite)); setInvite(next); history.replaceState(null, "", `/?book=${encodeURIComponent(next)}`);
      }} />}
      {error && <Toast message={error} onClose={() => setError("")} />}
    </main>
  );
}

function Landing({ onCreated }: { onCreated: (invite: string, identity: Identity) => void }) {
  const [name, setName] = useState(""); const [nickname, setNickname] = useState(""); const [currency, setCurrency] = useState("CNY");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/books", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, nickname, currency }) });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as Identity & { inviteToken: string; adminToken: string };
      onCreated(result.inviteToken, { memberToken: result.memberToken, memberId: result.memberId, adminToken: result.adminToken });
    } catch (err) { setError(err instanceof Error ? err.message : "创建失败"); } finally { setBusy(false); }
  }
  return (
    <main className="landing">
      <header className="landing-nav"><div className="brand"><span className="brand-mark">AA</span><span>一起AA</span></div><span className="free-badge">免费 · 无须注册</span></header>
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow coral">朋友一起玩，账也一起记</p>
          <h1>旅途尽兴，<br /><em>分钱不费心。</em></h1>
          <p className="hero-lead">谁付了、谁参加、该给谁多少，一本账自动算清。无需下载 App，发个链接就能一起记。</p>
          <div className="proof-row"><span><b>✓</b>只和参与的人分</span><span><b>✓</b>自动减少转账次数</span><span><b>✓</b>数据保存在云端</span></div>
          <div className="route-card" aria-hidden="true">
            <span className="route-dot orange">出发</span><span className="route-line" /><span className="route-icon">✦</span><span className="route-line dotted" /><span className="route-dot blue">算清</span>
          </div>
        </div>
        <form className="create-card" onSubmit={submit}>
          <div className="card-kicker"><span>01</span>创建旅行账本</div>
          <label>这次去哪儿？<input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：川西自驾 5 日" maxLength={40} required /></label>
          <div className="form-row"><label>你的昵称<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例如：小林" maxLength={24} required /></label><label>结算币种<select value={currency} onChange={(e) => setCurrency(e.target.value)}>{currencyOptions.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label></div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary large" disabled={busy}>{busy ? "正在创建…" : "创建账本 →"}</button>
          <p className="fine-print">创建后会得到邀请链接，发给同行朋友即可加入。</p>
        </form>
      </section>
      <section className="how-it-works"><p className="eyebrow">就三步</p><div className="steps"><article><span>1</span><h3>发链接</h3><p>朋友填昵称即可加入</p></article><article><span>2</span><h3>随手记</h3><p>勾选这笔钱该谁来分</p></article><article><span>3</span><h3>一键结</h3><p>自动给出最少转账方案</p></article></div></section>
    </main>
  );
}

function Join({ book, invite, onJoined }: { book: Snapshot["book"]; invite: string; onJoined: (identity: Identity) => void }) {
  const [nickname, setNickname] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(`/api/books/${encodeURIComponent(invite)}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) });
    if (!response.ok) { setError(await readError(response)); setBusy(false); return; }
    onJoined(await response.json());
  }
  return <main className="center-screen"><div className="join-card"><span className="brand-mark big">AA</span><p className="eyebrow">你收到一份旅行账本</p><h1>{book.name}</h1><p>填个昵称，和朋友一起记账。</p><form onSubmit={submit}><label>你的昵称<input autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="大家认得出的名字" maxLength={24} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary large" disabled={busy}>{busy ? "正在加入…" : "加入账本 →"}</button></form></div></main>;
}

function Overview({ data, memberName, onAdd, onExpense, onSettle }: { data: Snapshot; memberName: (id: string) => string; onAdd: () => void; onExpense: (expense: Expense) => void; onSettle: () => void }) {
  return <section className="content overview-grid"><div className="main-column"><div className="total-card"><div><p>本次总支出</p><strong>{money(data.totalSpent, data.book.currency)}</strong><span>{data.expenses.length} 笔消费</span></div><button onClick={onAdd}>＋ 记一笔</button></div><SectionTitle title="最近账目" action="查看全部" onAction={() => document.querySelector<HTMLButtonElement>('.tabs button:nth-child(2)')?.click()} />{data.expenses.length ? <div className="expense-stack">{data.expenses.slice(0, 5).map((expense) => <ExpenseRow key={expense.id} expense={expense} data={data} memberName={memberName} onClick={() => onExpense(expense)} />)}</div> : <Empty title="还没有账目" detail="谁先付钱，谁就来记第一笔吧。" action="记第一笔" onAction={onAdd} />}</div><aside><SectionTitle title="成员余额" /><div className="balance-card">{data.members.filter((m) => !m.inactive).map((member) => <div className="balance-row" key={member.id}><span className="avatar">{initials(member.name)}</span><div><b>{member.name}</b><small>付了 {money(member.paid, data.book.currency)}</small></div><strong className={member.balance >= 0 ? "positive" : "negative"}>{member.balance >= 0 ? "应收 " : "应付 "}{money(Math.abs(member.balance), data.book.currency)}</strong></div>)}<button className="soft-button" onClick={onSettle}>查看怎么结清 →</button></div></aside></section>;
}

function ExpenseList({ data, memberName, onAdd, onExpense }: { data: Snapshot; memberName: (id: string) => string; onAdd: () => void; onExpense: (expense: Expense) => void }) {
  const groups = useMemo(() => {
    const result = new Map<string, Expense[]>();
    data.expenses.forEach((expense) => { const month = expense.expenseDate.slice(0, 7); result.set(month, [...(result.get(month) || []), expense]); }); return result;
  }, [data.expenses]);
  return <section className="content single"><div className="section-head"><div><p className="eyebrow">全部流水</p><h2>账目记录</h2></div><button className="primary" onClick={onAdd}>＋ 记一笔</button></div>{data.expenses.length ? [...groups].map(([month, list]) => <div key={month} className="month-group"><h3>{month.replace("-", " 年 ")} 月 <span>{money(list.reduce((sum, item) => sum + item.amount, 0), data.book.currency)}</span></h3><div className="expense-stack">{list.map((expense) => <ExpenseRow key={expense.id} expense={expense} data={data} memberName={memberName} onClick={() => onExpense(expense)} />)}</div></div>) : <Empty title="账本还是空的" detail="吃饭、打车、门票，付完就顺手记一笔。" action="记第一笔" onAction={onAdd} />}</section>;
}

function ExpenseRow({ expense, data, memberName, onClick }: { expense: Expense; data: Snapshot; memberName: (id: string) => string; onClick: () => void }) {
  const day = expense.expenseDate.slice(8, 10); const month = Number(expense.expenseDate.slice(5, 7));
  return <button className="expense-row" onClick={onClick}><span className="date-tile"><b>{day}</b><small>{month}月</small></span><span className="expense-copy"><b>{expense.title}</b><small>{memberName(expense.paidBy)} 付款 · {expense.shares.length} 人分摊</small></span><strong>{money(expense.amount, data.book.currency)}</strong><span className="chevron">›</span></button>;
}

function Members({ data, identity, invite, authedFetch, onChanged }: { data: Snapshot; identity: Identity; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  async function action(member: Member, type: "deactivate" | "reactivate" | "regenerate") {
    const response = await authedFetch(`/api/books/${invite}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ action: type }) });
    if (!response.ok) { setMessage(await readError(response)); return; }
    const result = await response.json() as { memberToken?: string; memberId?: string };
    if (type === "regenerate" && result.memberToken) {
      const url = `${location.origin}/?book=${encodeURIComponent(invite)}&member=${encodeURIComponent(result.memberToken)}&memberId=${encodeURIComponent(member.id)}`;
      await navigator.clipboard.writeText(url); setMessage(`${member.name} 的个人访问链接已复制`);
    } else { await onChanged(); setMessage(type === "deactivate" ? "成员已停用" : "成员已恢复"); }
  }
  return <section className="content single"><div className="section-head"><div><p className="eyebrow">同行伙伴</p><h2>成员</h2></div><span className="count-badge">{data.members.filter((m) => !m.inactive).length} 人</span></div><div className="member-grid">{data.members.map((member) => <article className={`member-card ${member.inactive ? "muted" : ""}`} key={member.id}><div className="member-top"><span className="avatar large-avatar">{initials(member.name)}</span><div><h3>{member.name}{member.id === identity.memberId && <em>我</em>}</h3><p>{member.isCreator ? "账本创建者" : member.inactive ? "已停用" : "同行成员"}</p></div></div><div className="mini-stats"><span>已付款<b>{money(member.paid, data.book.currency)}</b></span><span>应承担<b>{money(member.owed, data.book.currency)}</b></span></div><div className={`net ${member.balance >= 0 ? "positive" : "negative"}`}>{member.balance >= 0 ? "净应收" : "净应付"}<b>{money(Math.abs(member.balance), data.book.currency)}</b></div>{identity.adminToken && !member.isCreator && <div className="member-actions"><button onClick={() => action(member, "regenerate")}>重发访问链接</button><button onClick={() => action(member, member.inactive ? "reactivate" : "deactivate")}>{member.inactive ? "恢复" : "停用"}</button></div>}</article>)}</div>{message && <Toast message={message} onClose={() => setMessage("")} />}</section>;
}

function Settle({ data, memberName, authedFetch, invite, onChanged }: { data: Snapshot; memberName: (id: string) => string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; invite: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  async function settle(item: Snapshot["suggestions"][number]) {
    setBusy(`${item.fromMemberId}-${item.toMemberId}`); setError("");
    const response = await authedFetch(`/api/books/${invite}/settlements`, { method: "POST", body: JSON.stringify(item) });
    if (!response.ok) setError(await readError(response)); else await onChanged(); setBusy("");
  }
  return <section className="content settle-layout"><div><p className="eyebrow">自动算清</p><h2>最少转账方案</h2><p className="section-lead">不追着每一笔原账还钱，按最终余额合并后，转账次数更少。</p>{data.suggestions.length ? <div className="settlement-list">{data.suggestions.map((item) => { const key = `${item.fromMemberId}-${item.toMemberId}`; return <article key={key}><span className="avatar">{initials(memberName(item.fromMemberId))}</span><div><p><b>{memberName(item.fromMemberId)}</b><span>转给</span><b>{memberName(item.toMemberId)}</b></p><strong>{money(item.amount, data.book.currency)}</strong></div><button disabled={busy === key} onClick={() => settle(item)}>{busy === key ? "记录中…" : "标记已转"}</button></article>; })}</div> : <div className="all-clear"><span>✓</span><h3>已经结清啦</h3><p>当前所有人的净余额都是 0。</p></div>}{error && <p className="form-error">{error}</p>}</div><aside className="settle-note"><span>✦</span><h3>这里怎么算？</h3><p>系统把所有消费合并，只保留每个人最终该收或该付的金额，再匹配成尽量少的转账。</p></aside>{data.settlements.length > 0 && <div className="history"><SectionTitle title="已记录的还款" />{data.settlements.map((item) => <p key={item.id}><span>{memberName(item.fromMemberId)} → {memberName(item.toMemberId)}</span><b>{money(item.amount, data.book.currency)}</b></p>)}</div>}</section>;
}

function ExpenseModal({ data, expense, editable, invite, authedFetch, onClose, onChanged }: { data: Snapshot; expense: Expense | null; editable: boolean; invite: string; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onChanged: () => Promise<void> }) {
  const activeMembers = data.members.filter((member) => !member.inactive);
  const [title, setTitle] = useState(expense?.title || ""); const [amountInput, setAmountInput] = useState(expense ? inputFromMinor(expense.amount, data.book.currency) : "");
  const [paidBy, setPaidBy] = useState(expense?.paidBy || activeMembers[0]?.id || ""); const [date, setDate] = useState(expense?.expenseDate || today());
  const [mode, setMode] = useState<"equal" | "custom">(expense ? "custom" : "equal");
  const [selected, setSelected] = useState<string[]>(expense ? expense.shares.map((share) => share.memberId) : activeMembers.map((member) => member.id));
  const [custom, setCustom] = useState<Record<string, string>>(() => Object.fromEntries(expense?.shares.map((share) => [share.memberId, inputFromMinor(share.amount, data.book.currency)]) || []));
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const total = minorFromInput(amountInput, data.book.currency);
  const computedShares = useMemo(() => {
    if (!selected.length) return [];
    if (mode === "custom") return selected.map((id) => ({ memberId: id, amount: minorFromInput(custom[id] || "", data.book.currency) }));
    return splitEqually(total, selected);
  }, [selected, mode, custom, total, data.book.currency]);
  const shareTotal = computedShares.reduce((sum, share) => sum + share.amount, 0);
  function toggle(id: string) { if (!editable) return; setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!editable) return; setBusy(true); setError("");
    if (!selected.length) { setError("请至少选择一位参与人"); setBusy(false); return; }
    if (!total || shareTotal !== total || computedShares.some((share) => share.amount <= 0)) { setError("分摊金额需要大于 0，且合计等于总金额"); setBusy(false); return; }
    const url = expense ? `/api/books/${invite}/expenses/${expense.id}` : `/api/books/${invite}/expenses`;
    const response = await authedFetch(url, { method: expense ? "PATCH" : "POST", body: JSON.stringify({ title, amount: total, paidBy, expenseDate: date, shares: computedShares }) });
    if (!response.ok) setError(await readError(response)); else await onChanged(); setBusy(false);
  }
  async function remove() {
    if (!expense || !confirm(`确定删除“${expense.title}”吗？`)) return; setBusy(true);
    const response = await authedFetch(`/api/books/${invite}/expenses/${expense.id}`, { method: "DELETE" });
    if (!response.ok) setError(await readError(response)); else await onChanged(); setBusy(false);
  }
  return <Modal onClose={onClose}><form className="expense-form" onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">{expense ? "账目详情" : "新增消费"}</p><h2>{expense ? expense.title : "记一笔"}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>{!editable && <div className="notice">这笔账由其他成员录入，你可以查看但不能修改。</div>}<fieldset disabled={!editable || busy}><label>消费名称<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：火锅、打车、门票" maxLength={60} required /></label><div className="form-row"><label>金额<div className="money-input"><span>{data.book.currency}</span><input inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" required /></div></label><label>日期<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label></div><label>谁付的钱？<select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{activeMembers.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label><div className="split-heading"><span>哪些人一起分？</span><div className="segmented"><button type="button" className={mode === "equal" ? "active" : ""} onClick={() => setMode("equal")}>平均分</button><button type="button" className={mode === "custom" ? "active" : ""} onClick={() => setMode("custom")}>自定义</button></div></div><div className="participant-list">{activeMembers.map((member) => { const isSelected = selected.includes(member.id); const share = computedShares.find((item) => item.memberId === member.id)?.amount || 0; return <div className={isSelected ? "selected" : ""} key={member.id}><button type="button" className="member-pick" onClick={() => toggle(member.id)}><span className="check">{isSelected ? "✓" : ""}</span><span className="avatar small">{initials(member.name)}</span><b>{member.name}</b></button>{isSelected && (mode === "custom" ? <input className="share-input" inputMode="decimal" aria-label={`${member.name}承担金额`} value={custom[member.id] || ""} onChange={(e) => setCustom({ ...custom, [member.id]: e.target.value })} placeholder="0.00" /> : <strong>{money(share, data.book.currency)}</strong>)}</div>; })}</div>{mode === "custom" && <p className={`sum-line ${shareTotal === total && total > 0 ? "good" : ""}`}>已分配 {money(shareTotal, data.book.currency)} / {money(total, data.book.currency)}</p>}</fieldset>{error && <p className="form-error">{error}</p>}<div className="modal-actions">{expense && editable && <button type="button" className="danger" onClick={remove} disabled={busy}>删除</button>}<span /><button type="button" className="secondary" onClick={onClose}>取消</button>{editable && <button className="primary" disabled={busy}>{busy ? "保存中…" : expense ? "保存修改" : "记下这笔"}</button>}</div></form></Modal>;
}

function ShareModal({ invite, data, identity, authedFetch, onClose, onInviteChanged }: { invite: string; data: Snapshot; identity: Identity; authedFetch: (url: string, init?: RequestInit) => Promise<Response>; onClose: () => void; onInviteChanged: (invite: string) => void }) {
  const [copied, setCopied] = useState(false); const [error, setError] = useState("");
  const url = typeof location === "undefined" ? "" : `${location.origin}/?book=${encodeURIComponent(invite)}`;
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  async function reset() {
    if (!confirm("更新后，旧邀请链接会立即失效。确定继续吗？")) return;
    const response = await authedFetch(`/api/books/${invite}/reset-invite`, { method: "POST", body: "{}" });
    if (!response.ok) { setError(await readError(response)); return; }
    const result = await response.json() as { inviteToken: string }; onInviteChanged(result.inviteToken);
  }
  return <Modal onClose={onClose}><div className="share-modal"><div className="modal-title"><div><p className="eyebrow">邀请同行朋友</p><h2>一起记「{data.book.name}」</h2></div><button className="close" onClick={onClose}>×</button></div><div className="invite-visual"><span>你</span><i>···</i><span>朋友</span><i>···</i><span>朋友</span></div><p>把下面的链接发到群里。朋友打开后填写自己的昵称，就能加入同一本账。</p><div className="copy-box"><input readOnly value={url} /><button onClick={copy}>{copied ? "已复制 ✓" : "复制链接"}</button></div><p className="privacy-note">🔒 只有拿到链接的人能看到账本，请不要公开发布。</p>{identity.adminToken && <button className="text-danger" onClick={reset}>旧链接泄露了？更新邀请链接</button>}{error && <p className="form-error">{error}</p>}</div></Modal>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { useEffect(() => { const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", handler); return () => removeEventListener("keydown", handler); }, [onClose]); return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-panel" role="dialog" aria-modal="true">{children}</div></div>; }
function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onAction}>{action} →</button>}</div>; }
function Empty({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) { return <div className="empty"><span>✦</span><h3>{title}</h3><p>{detail}</p><button onClick={onAction}>{action}</button></div>; }
function LoadingScreen() { return <main className="center-screen"><div className="loader"><span className="brand-mark big">AA</span><p>正在打开账本…</p></div></main>; }
function MessageScreen({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) { return <main className="center-screen"><div className="join-card"><span className="brand-mark big">AA</span><h1>{title}</h1><p>{detail}</p><button className="primary large" onClick={onAction}>{action}</button></div></main>; }
function Toast({ message, onClose }: { message: string; onClose: () => void }) { useEffect(() => { const id = setTimeout(onClose, 3200); return () => clearTimeout(id); }, [onClose]); return <button className="toast" onClick={onClose}>{message}<span>×</span></button>; }
function Icon({ name }: { name: "share" }) { return name === "share" ? <span aria-hidden="true">↗</span> : null; }
