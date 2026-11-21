import { getLocalData } from "./localStore";
export function customerCode(id: string) {
  return (
    getLocalData().customers.find((row) => row.id === id)?.code ||
    "جارٍ تجهيز الكود"
  );
}
export function recordNumber(id: string) {
  const data = getLocalData();
  const transfer = data.transfers.find((row) => row.id === id);
  if (transfer) return transfer.code || "جارٍ تجهيز الرقم";
  const cash = data.cash.find((row) => row.id === id);
  if (cash?.code) return cash.code;
  if (cash?.sequence)
    return `رقم الحركة المحلي ${String(cash.sequence).padStart(2, "0")}`;
  const exchange = data.exchange.find(
    (row) =>
      row.id === id || `${row.id}-base` === id || `${row.id}-counter` === id,
  );
  if (exchange?.sequence)
    return `رقم العملية المحلي ${String(exchange.sequence).padStart(2, "0")}`;
  const sale = data.inventorySales?.find((row) => row.id === id);
  if (sale?.sequence)
    return `رقم البيع ${String(sale.sequence).padStart(2, "0")}`;
  return id;
}
