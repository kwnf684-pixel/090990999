import type { LocalData } from "./localStore";

type Numbered = {
  id: string;
  date?: string;
  created?: string;
  code?: string;
  sequence?: number;
};
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function randomCode(digits: number, used: Iterable<string>): string {
  const taken = new Set(Array.from(used, (code) => code.toLowerCase()));
  const limit = 26 * 26 * 10 ** digits;
  if (taken.size >= limit) throw Error("نفدت الأكواد المتاحة.");
  const values = crypto.getRandomValues(new Uint32Array(3));
  const first = values[0] % 52;
  const second = values[1] % 52;
  let slot =
    ((first % 26) * 26 + (second % 26)) * 10 ** digits +
    (values[2] % 10 ** digits);
  // Probe the remaining space if the randomly selected code is already in use.
  for (let attempt = 0; attempt < limit; attempt++, slot = (slot + 1) % limit) {
    const number = slot % 10 ** digits;
    const pair = Math.floor(slot / 10 ** digits);
    const a = Math.floor(pair / 26) + (first >= 26 ? 26 : 0);
    const b = (pair % 26) + (second >= 26 ? 26 : 0);
    const code = letters[a] + letters[b] + String(number).padStart(digits, "0");
    if (!taken.has(code.toLowerCase())) return code;
  }
  throw Error("تعذر إنشاء كود فريد.");
}

function assignCodes(rows: Numbered[], digits: number) {
  const used = new Set(rows.flatMap((row) => (row.code ? [row.code] : [])));
  const seen = new Set<string>();
  for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
    if (row.code && !seen.has(row.code.toLowerCase())) {
      seen.add(row.code.toLowerCase());
      continue;
    }
    row.code = randomCode(digits, used);
    used.add(row.code);
    seen.add(row.code.toLowerCase());
  }
}

function assignSequence(rows: Numbered[]) {
  let next = Math.max(0, ...rows.map((row) => row.sequence || 0));
  const seen = new Set<number>();
  for (const row of [...rows].sort(
    (a, b) =>
      (a.date || a.created || "").localeCompare(b.date || b.created || "") ||
      a.id.localeCompare(b.id),
  )) {
    if (!row.sequence || seen.has(row.sequence)) row.sequence = ++next;
    seen.add(row.sequence);
  }
}

export function withReferenceNumbers(data: LocalData): LocalData {
  const next = structuredClone(data);
  assignCodes(next.customers, 3);
  assignCodes(next.transfers, 4);
  assignSequence(next.exchange.filter((row) => row.type === "شراء"));
  assignSequence(next.exchange.filter((row) => row.type === "بيع"));
  assignSequence(next.inventorySales || []);
  for (const customer of next.customers) {
    for (const type of ["قبض", "صرف"]) {
      const rows = next.cash.filter((row) => {
        const byName =
          !row.customerId &&
          row.partyType === "عميل" &&
          row.party.trim() === customer.name.trim() &&
          next.customers.filter((c) => c.name.trim() === row.party.trim())
            .length === 1;
        return (row.customerId === customer.id || byName) && row.type === type;
      });
      assignSequence(rows);
      for (const row of rows)
        row.code = `${customer.code}-${type === "صرف" ? String(row.sequence).padStart(2, "0") : row.sequence}`;
    }
  }
  for (const type of ["قبض", "صرف"]) {
    assignSequence(next.cash.filter((row) => !row.code && row.type === type));
  }
  return next;
}

export function needsReferenceNumbers(data: LocalData) {
  return (
    data.customers.some((row) => !row.code) ||
    data.transfers.some((row) => !row.code) ||
    data.exchange.some((row) => !row.sequence) ||
    (data.inventorySales || []).some((row) => !row.sequence) ||
    data.cash.some(
      (row) =>
        !row.sequence ||
        (!row.code &&
          (data.customers.some((c) => row.customerId === c.id) ||
            (!row.customerId &&
              row.partyType === "عميل" &&
              data.customers.filter((c) => row.party.trim() === c.name.trim())
                .length === 1))),
    )
  );
}

// New and edited records receive numbers in the same transaction as their financial data.
export function numberChangedRecords(
  next: LocalData,
  previous: LocalData,
): LocalData {
  for (const key of [
    "customers",
    "transfers",
    "cash",
    "exchange",
    "inventorySales",
  ] as const) {
    const old = new Map((previous[key] || []).map((row) => [row.id, row]));
    for (const row of next[key] || []) {
      const before = old.get(row.id);
      if (before) {
        row.code ??= before.code;
        row.sequence ??= before.sequence;
      }
    }
  }
  for (const row of next.cash) {
    const before = previous.cash.find((value) => value.id === row.id);
    if (
      before &&
      (before.customerId !== row.customerId || before.type !== row.type)
    ) {
      delete row.code;
      delete row.sequence;
    }
  }
  const numbered = withReferenceNumbers(next);
  for (const key of [
    "customers",
    "transfers",
    "cash",
    "exchange",
    "inventorySales",
  ] as const) {
    const old = new Map(
      (previous[key] || []).map((row) => [row.id, JSON.stringify(row)]),
    );
    const numbers = new Map((numbered[key] || []).map((row) => [row.id, row]));
    for (const row of next[key] || []) {
      if (JSON.stringify(row) === old.get(row.id)) continue;
      const value = numbers.get(row.id)!;
      row.code = value.code;
      row.sequence = value.sequence;
    }
  }
  return next;
}

export function referenceMigration(data: LocalData): LocalData {
  const numbered = withReferenceNumbers(data);
  let count = 0;
  let bytes = 0;
  for (const key of [
    "customers",
    "transfers",
    "exchange",
    "cash",
    "inventorySales",
  ] as const) {
    const numbers = new Map((numbered[key] || []).map((row) => [row.id, row]));
    const ordered = [...(data[key] || [])].sort(
      (a, b) =>
        (numbers.get(a.id)?.sequence || 0) - (numbers.get(b.id)?.sequence || 0),
    );
    for (const row of ordered) {
      const next = numbers.get(row.id)!;
      if (row.code === next.code && row.sequence === next.sequence) continue;
      const size = new TextEncoder().encode(JSON.stringify(next)).byteLength;
      if (count >= 20 || bytes + size > 60000) return data;
      row.code = next.code;
      row.sequence = next.sequence;
      bytes += size;
      count++;
    }
  }
  return data;
}
