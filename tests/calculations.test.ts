import assert from "node:assert/strict";
import test from "node:test";
import { minimalTransfers, splitEqually } from "../lib/calculations.ts";

test("平均分把不能整除的最小单位稳定分配给前面的成员", () => {
  assert.deepEqual(splitEqually(1000, ["a", "b", "c"]), [
    { memberId: "a", amount: 334 }, { memberId: "b", amount: 333 }, { memberId: "c", amount: 333 },
  ]);
});

test("只在实际参与的人之间平均分", () => {
  assert.deepEqual(splitEqually(900, ["a", "c"]), [
    { memberId: "a", amount: 450 }, { memberId: "c", amount: 450 },
  ]);
});

test("最少转账保持每个人最终余额守恒", () => {
  const balances = [{ id: "a", balance: 700 }, { id: "b", balance: -200 }, { id: "c", balance: -500 }];
  const transfers = minimalTransfers(balances);
  assert.equal(transfers.length, 2);
  assert.deepEqual(transfers, [
    { fromMemberId: "b", toMemberId: "a", amount: 200 },
    { fromMemberId: "c", toMemberId: "a", amount: 500 },
  ]);
});

test("多人连续付款可合并成较少的转账", () => {
  const transfers = minimalTransfers([
    { id: "a", balance: 500 }, { id: "b", balance: 300 }, { id: "c", balance: -200 }, { id: "d", balance: -600 },
  ]);
  assert.equal(transfers.reduce((sum, item) => sum + item.amount, 0), 800);
  assert.ok(transfers.length <= 3);
});
