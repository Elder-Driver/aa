export function splitEqually(amount: number, memberIds: string[]) {
  if (!Number.isInteger(amount) || amount <= 0 || memberIds.length === 0) return [];
  const base = Math.floor(amount / memberIds.length);
  const remainder = amount % memberIds.length;
  return memberIds.map((memberId, index) => ({ memberId, amount: base + (index < remainder ? 1 : 0) }));
}

export function minimalTransfers(balances: Array<{ id: string; balance: number }>) {
  const creditors = balances.filter((item) => item.balance > 0).map((item) => ({ id: item.id, amount: item.balance }));
  const debtors = balances.filter((item) => item.balance < 0).map((item) => ({ id: item.id, amount: -item.balance }));
  const transfers: Array<{ fromMemberId: string; toMemberId: string; amount: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    if (amount > 0) transfers.push({ fromMemberId: debtors[debtorIndex].id, toMemberId: creditors[creditorIndex].id, amount });
    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;
    if (debtors[debtorIndex].amount === 0) debtorIndex += 1;
    if (creditors[creditorIndex].amount === 0) creditorIndex += 1;
  }
  return transfers;
}
