import { test } from "node:test";
import assert from "node:assert/strict";
import {
  withReferenceNumbers,
  referenceMigration,
  numberChangedRecords,
  randomCode,
} from "../src/data/referenceNumbers.ts";
import { csvContent } from "../src/data/reportExport.ts";
const empty = () => ({
  schema: 1,
  customers: [],
  transfers: [],
  cash: [],
  exchange: [],
  rates: [],
});
const fixture = () => ({
  ...empty(),
  customers: Array.from({ length: 45 }, (_, i) => ({
    id: "c" + i,
    name: "عميل " + i,
    created: "2026-11-01",
    balances: { IQD: i * 100, USD: i === 0 ? 0 : -i },
  })),
  transfers: Array.from({ length: 55 }, (_, i) => ({
    id: "t" + i,
    amount: 100 + i,
    direction: i % 2 ? "incoming" : "outgoing",
  })),
  exchange: Array.from({ length: 70 }, (_, i) => ({
    id: "e" + i,
    date: "2026-11-01T" + String(i).padStart(3, "0"),
    type: i % 2 ? "بيع" : "شراء",
    amount: i,
  })),
  cash: Array.from({ length: 70 }, (_, i) => ({
    id: "cash" + i,
    customerId: "c0",
    party: "عميل 0",
    partyType: "عميل",
    date: "2026-11-01T" + String(i).padStart(3, "0"),
    type: i % 2 ? "قبض" : "صرف",
    amount: i + 1,
  })),
});
function migrate(input) {
  let data = globalThis.structuredClone(input);
  for (let i = 0; i < 30; i++) {
    const next = numberChangedRecords(
      referenceMigration(globalThis.structuredClone(data)),
      data,
    );
    if (JSON.stringify(next) === JSON.stringify(data)) return data;
    const changes = ["customers", "transfers", "cash", "exchange"].flatMap(
      (k) =>
        next[k].filter(
          (r, n) => JSON.stringify(r) !== JSON.stringify(data[k][n]),
        ),
    );
    assert.ok(changes.length <= 20);
    data = next;
  }
  throw Error("migration did not finish");
}
function financial(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      ["code", "sequence"].includes(key) ? undefined : value,
    ),
  );
}
test("legacy migration is bounded, stable, preserves internal IDs and all financial fields", () => {
  const before = fixture();
  const after = migrate(before);
  assert.deepEqual(financial(after), before);
  assert.deepEqual(migrate(after), after);
  for (const key of ["customers", "transfers"]) {
    const codes = after[key].map((r) => r.code.toLowerCase());
    assert.equal(new Set(codes).size, codes.length);
  }
  assert.ok(after.customers.every((r) => /^[A-Za-z]{2}[0-9]{3}$/.test(r.code)));
  assert.ok(after.transfers.every((r) => /^[A-Za-z]{2}[0-9]{4}$/.test(r.code)));
});
test("buy, sell, receipt, payment sequences start at one and continue independently", () => {
  const data = migrate(fixture());
  for (const type of ["شراء", "بيع"])
    assert.deepEqual(
      data.exchange
        .filter((r) => r.type === type)
        .map((r) => r.sequence)
        .sort((a, b) => a - b),
      Array.from({ length: 35 }, (_, i) => i + 1),
    );
  const code = data.customers[0].code;
  assert.equal(data.cash[0].code, code + "-01");
  assert.equal(data.cash[1].code, code + "-1");
  const next = numberChangedRecords(
    {
      ...data,
      cash: [
        ...data.cash,
        { id: "new", customerId: "c0", date: "2026-11-22", type: "صرف" },
      ],
    },
    data,
  );
  assert.equal(next.cash.at(-1).code, code + "-36");
  assert.deepEqual(next.customers, data.customers);
});
test("resaving an exchange retains its number and new day continues numbering", () => {
  const data = migrate(fixture());
  const copy = globalThis.structuredClone(data);
  copy.exchange[0].amount = 200;
  const after = numberChangedRecords(copy, data);
  assert.equal(after.exchange[0].sequence, data.exchange[0].sequence);
  const next = numberChangedRecords(
    {
      ...after,
      exchange: [
        ...after.exchange,
        { id: "next", date: "2026-11-22", type: "شراء" },
      ],
    },
    after,
  );
  assert.equal(next.exchange.at(-1).sequence, 36);
});
test("collisions are repaired and generated codes exclude existing codes ignoring case", () => {
  const data = withReferenceNumbers({
    ...empty(),
    customers: [
      { id: "a", code: "As001" },
      { id: "b", code: "as001" },
    ],
    exchange: [
      { id: "a", type: "شراء", sequence: 1 },
      { id: "b", type: "شراء", sequence: 1 },
    ],
  });
  assert.notEqual(
    data.customers[0].code.toLowerCase(),
    data.customers[1].code.toLowerCase(),
  );
  assert.notEqual(data.exchange[0].sequence, data.exchange[1].sequence);
  for (let i = 0; i < 100; i++)
    assert.notEqual(randomCode(3, ["As001"]).toLowerCase(), "as001");
});
test("CSV exports Unicode, quotes and numeric values and neutralizes formulas", () => {
  const csv = csvContent([
    ["اسم العميل", "المبلغ"],
    ["أحمد, علي", -12],
    ["=SUM(A1)", 'نص "مقتبس"'],
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"أحمد, علي","-12"'));
  assert.ok(csv.includes("'="));
  assert.ok(csv.includes('""مقتبس""'));
});
