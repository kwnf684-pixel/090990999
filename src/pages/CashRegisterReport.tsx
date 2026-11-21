import {recordNumber} from '../data/displayNumbers';
import {registers,boxName} from '../data/localRegisters';
import {useCashLedger} from '../data/cashLedger';
import {useCurrencies} from '../data/currencyStore';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import {
  FinanceRows,
  FinanceModal,
  FinanceDetails,
} from "../components/FinanceViews";
import {

  registerTypes,


} from "../data/cashRegistersMock";
import "./financePages.css";
import "./registerReport.css";
const registerDay=new Date().toLocaleDateString('sv-SE');
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const empty = {
  box: "",
  currency: "",
  branch: "",
  type: "",
  user: "",
  from: "",
  to: "",
  reference: "",
  query: "",
};
export default function CashRegisterReport({
  movements = false,
}: {
  movements?: boolean;
}) {
  const {registerMovements,registerBalanceRows}=useCashLedger();
  const registerCurrencies=[...new Set(registerBalanceRows.map(row=>row.currency))];
  const currencies=useCurrencies();
  const [expanded,setExpanded]=useState(false); const reduced=useReducedMotion();
  const [filters, setFilters] = useState({ ...empty });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const badDates = !!(filters.from && filters.to && filters.from > filters.to);
  const matches = (value: string, query: string) =>
    value.toLowerCase().includes(query.trim().toLowerCase());
  const balances = registerBalanceRows.filter(
    (r) =>
      (!filters.box || r.box === filters.box) &&
      (!filters.currency || r.currency === filters.currency) &&
      (!filters.branch || r.branch === filters.branch),
  );
  const ledger = registerMovements
    .filter(
      (m) =>
        !badDates &&
        (!filters.box || m.box === filters.box) &&
        (!filters.currency || m.currency === filters.currency) &&
        (!filters.type || m.type === filters.type) &&
        (!filters.user || m.user === filters.user) &&
        (!filters.from || m.date.slice(0, 10) >= filters.from) &&
        (!filters.to || m.date.slice(0, 10) <= filters.to) &&
        matches(m.reference, filters.reference) &&
        matches(
          `${recordNumber(m.id)} ${m.party} ${m.description} ${boxName(m.box)}`,
          filters.query,
        ),
    )
    .reverse();
  const count = movements ? ledger.length : balances.length;
  const pages = Math.max(1, Math.ceil(count / 6));
  const current = Math.min(page, pages);
  const title = movements ? "حركة الصندوق" : "كشف رصيد الصندوق";
  const balance = registerBalanceRows.find((r) => r.id === selected);
  const movement = registerMovements.find((m) => m.id === selected);
  function change(key: keyof typeof empty, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function total(kind: "incoming" | "outgoing" | "net") {
    return (
      <div className="tl-currency-totals">
        {registerCurrencies
          .filter((c) => !filters.currency || c === filters.currency)
          .map((currency) => (
            <span key={currency}>
              <b>
                {fmt(
                  ledger
                    .filter(
                      (m) =>
                        m.currency === currency &&
                        (kind !== "net" || m.date.startsWith(registerDay)),
                    )
                    .reduce(
                      (sum, m) =>
                        sum +
                        (kind === "net" ? m.incoming - m.outgoing : m[kind]),
                      0,
                    ),
                )}
              </b>
              <small>{currency}</small>
            </span>
          ))}
      </div>
    );
  }
  const headers = movements
    ? [
        "رقم الحركة",
        "التاريخ والوقت",
        "الصندوق",
        "نوع الحركة",
        "الطرف",
        "المرجع",
        "البيان",
        "المبلغ",
        "العملة",
        "داخل",
        "خارج",
        "الرصيد بعد الحركة",
        "المستخدم",
        "الحالة",
        "عرض",
      ]
    : [
        "اسم الصندوق",
        "العملة",
        "الرصيد الافتتاحي",
        "إجمالي الداخل",
        "إجمالي الخارج",
        "الرصيد الحالي",
        "آخر حركة",
        "آخر تحديث",
        "عرض",
      ];
  const rows = movements
    ? ledger.map((m) => ({
        id: m.id,
        cells: [
          recordNumber(m.id),
          m.date.replace("T", " · "),
          boxName(m.box),
          m.type,
          m.party,
          m.reference,
          m.description,
          fmt(m.amount),
          m.currency,
          fmt(m.incoming),
          fmt(m.outgoing),
          fmt(m.balance),
          m.user,
          <span
            className={`tl-badge ${m.status === "مكتملة" ? "done" : m.status === "ملغاة" ? "cancelled" : "pending"}`}
          >
            {m.status}
          </span>,
          <button className="tl-button" onClick={() => setSelected(m.id)}>
            عرض
          </button>,
        ],
      }))
    : balances.map((r) => ({
        id: r.id,
        cells: [
          r.name,
          r.currency,
          fmt(r.opening),
          fmt(r.incoming),
          fmt(r.outgoing),
          fmt(r.current),
          r.last.replace("T", " · "),
          r.updated.replace("T", " · "),
          <button className="tl-button" onClick={() => setSelected(r.id)}>
            عرض
          </button>,
        ],
      }));
  return (
    <div className="finance-page register-report">
      <nav className="breadcrumb">
        <Link to="/cashbox">الصندوق</Link>
        <span> / {title}</span>
      </nav>
      <PageHeader
        title={title}
        description={
          movements
            ? "تتبع جميع حركات الصناديق ومراجعها داخل البيانات التجريبية."
            : "أرصدة افتتاحية وداخل وخارج لكل صندوق وعملة."
        }
      />
      <p className="tl-disclaimer">
        أرصدة محفوظة على هذا المتصفح، محسوبة من سندات القبض والصرف وعمليات الصيرفة المكتملة.
      </p>
      {movements && <button className="tl-button primary" aria-expanded={expanded} aria-controls="cash-movement-ledger" onClick={()=>{setExpanded(!expanded);setSelected("");}}>سجل حركة الصندوق {expanded ? "−" : "+"}</button>}
      <AnimatePresence initial={false}>{(!movements || expanded) && <motion.div id={movements ? "cash-movement-ledger" : undefined} key="ledger" initial={movements && !reduced ? {height:0,opacity:0}:false} animate={{height:"auto",opacity:1}} exit={reduced ? {opacity:0}:{height:0,opacity:0}} transition={{duration:reduced ? 0 : .18}} style={movements ? {overflow:"hidden"}:undefined}>
      <form
        className="panel tl-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setNotice(`عُرضت ${count} نتيجة محلية.`);
        }}
      >
        <div className="tl-filter-grid">
          {(
            [
              ["box", "اختيار الصندوق", registers.map((b) => [b.id, b.name])],
              ["currency", "العملة", currencies.map(c=>[c.code,`${c.label} · ${c.code}`])],
              ...(movements
                ? [
                    ["type", "نوع الحركة", registerTypes.map((t) => [t, t])],
                    [
                      "user",
                      "المستخدم",
                      [...new Set(registerMovements.map((m) => m.user))].map(
                        (u) => [u, u],
                      ),
                    ],
                  ]
                : [
                    [
                      "branch",
                      "الفرع",
                      [...new Set(registers.map((b) => b.branch))].map((b) => [
                        b,
                        b,
                      ]),
                    ],
                  ]),
            ] as [keyof typeof empty, string, string[][]][]
          ).map(([key, label, options]) => (
            <label className="tl-field" key={key}>
              <span>{label}</span>
              <select
                aria-label={label}
                value={filters[key]}
                onChange={(e) => change(key, e.target.value)}
              >
                <option value="">الكل</option>
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {movements && (
            <>
              {(["from", "to"] as const).map((key) => (
                <label className="tl-field" key={key}>
                  <span>{key === "from" ? "من تاريخ" : "إلى تاريخ"}</span>
                  <input
                    aria-label={key === "from" ? "من تاريخ" : "إلى تاريخ"}
                    type="date"
                    value={filters[key]}
                    onInput={(e) => change(key, e.currentTarget.value)}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
              {(
                [
                  ["reference", "رقم المرجع"],
                  ["query", "بحث"],
                ] as const
              ).map(([key, label]) => (
                <label className="tl-field" key={key}>
                  <span>{label}</span>
                  <input
                    aria-label={label}
                    value={filters[key]}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
            </>
          )}
        </div>
        {badDates && (
          <p className="tl-error" role="alert">
            تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.
          </p>
        )}
        <div className="tl-filter-actions">
          {movements ? (
            <button className="tl-button primary" type="submit">
              بحث
            </button>
          ) : (
            <button
              className="tl-button"
              type="button"
              onClick={() =>
                setNotice(
                  `تم تحديث العرض المحلي · ${new Date().toLocaleTimeString("ar-IQ")}`,
                )
              }
            >
              تحديث
            </button>
          )}
          <button
            className="tl-button"
            type="button"
            disabled={!count || badDates}
            onClick={() => window.print()}
          >
            طباعة
          </button>
          <button
            className="tl-button"
            type="button"
            onClick={() => {
              setFilters({ ...empty });
              setPage(1);
              setNotice("");
            }}
          >
            مسح الفلاتر
          </button>
        </div>
      </form>
      <div className="tl-stats">
        {movements ? (
          <>
            <article className="panel">
              <small>حركات اليوم</small>
              <b className="tl-stat-number">
                {ledger.filter((m) => m.date.startsWith(registerDay)).length}
              </b>
            </article>
            <article className="panel">
              <small>إجمالي الداخل</small>
              {total("incoming")}
            </article>
            <article className="panel">
              <small>إجمالي الخارج</small>
              {total("outgoing")}
            </article>
            <article className="panel">
              <small>صافي حركة اليوم</small>
              {total("net")}
            </article>
          </>
        ) : (
          <>
            {registerCurrencies.map((c) => (
              <article className="panel" key={c}>
                <small>
                  {c==='USD'?'إجمالي رصيد الدولار':c==='IQD'?'إجمالي رصيد الدينار':`إجمالي رصيد ${c}`}
                </small>
                <b className="register-stat" dir="ltr">
                  {!filters.currency || filters.currency === c
                    ? `${fmt(balances.filter((r) => r.currency === c).reduce((s, r) => s + r.current, 0))} ${c}`
                    : "—"}
                </b>
              </article>
            ))}
            <article className="panel">
              <small>عدد الصناديق</small>
              <b className="tl-stat-number">
                {new Set(balances.map((r) => r.box)).size}
              </b>
            </article>
          </>
        )}
      </div>
      <p className="tl-summary-note">
        حسب الفلاتر الحالية. الأرقام منفصلة حسب العملة؛{" "}
        {movements
          ? "إجماليات الداخل والخارج للفترة المحددة، وصافي اليوم لليوم التجريبي فقط."
          : "الرصيد الافتتاحي + الداخل − الخارج = الرصيد الحالي."}
      </p>
      <p className="tl-notice" role="status">
        {notice}
      </p>
      <section className="panel finance-results">
        <div className="panel-heading">
          <h2>{movements ? "سجل حركة الصندوق" : "تفاصيل أرصدة الصناديق"}</h2>
          <span>{count} نتيجة</span>
        </div>
        <FinanceRows
          headers={headers}
          rows={rows.slice((current - 1) * 6, current * 6)}
        />
        <nav className="tl-pagination">
          <button
            className="tl-button"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            السابق
          </button>
          <span>
            صفحة {current} من {pages}
          </span>
          <button
            className="tl-button"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            التالي
          </button>
        </nav>
      </section>
      <section className="register-print">
        <h1>{title} · نسخة تجريبية</h1>
        <p>
          غير صالح للتعامل المالي · {count} نتيجة مطابقة للفلاتر · {registerDay}
        </p>
        <p>
          {filters.box ? boxName(filters.box) : "كل الصناديق"} ·{" "}
          {filters.currency || "كل العملات"} · {filters.from || "بداية السجل"} —{" "}
          {filters.to || "نهاية السجل"}
        </p>
        <FinanceRows
          headers={headers.slice(0, -1)}
          rows={rows.map((r) => ({ ...r, cells: r.cells.slice(0, -1) }))}
        />
      </section>
      {selected && (
        <FinanceModal
          title={movements ? "تفاصيل حركة الصندوق" : "تفاصيل رصيد الصندوق"}
          close={() => setSelected("")}
        >
          {movements && movement ? (
            <FinanceDetails
              items={[
                ["رقم الحركة", recordNumber(movement.id)],
                ["التاريخ", movement.date],
                ["الصندوق", boxName(movement.box)],
                ["نوع الحركة", movement.type],
                ["الطرف", movement.party],
                ["المرجع", movement.reference],
                ["البيان", movement.description],
                ["المبلغ", `${fmt(movement.amount)} ${movement.currency}`],
                ["داخل", fmt(movement.incoming)],
                ["خارج", fmt(movement.outgoing)],
                [
                  "الرصيد بعد الحركة",
                  `${fmt(movement.balance)} ${movement.currency}`,
                ],
                ["المستخدم", movement.user],
                ["الحالة", movement.status],
              ]}
            />
          ) : (
            balance && (
              <>
                <FinanceDetails
                  items={[
                    ["الصندوق", balance.name],
                    ["الفرع", balance.branch],
                    ["العملة", balance.currency],
                    ["الرصيد الافتتاحي", fmt(balance.opening)],
                    ["إجمالي الداخل", fmt(balance.incoming)],
                    ["إجمالي الخارج", fmt(balance.outgoing)],
                    ["الرصيد الحالي", fmt(balance.current)],
                    ["آخر حركة", balance.last],
                    ["آخر تحديث", balance.updated],
                  ]}
                />
                <h2>آخر الحركات</h2>
                <div className="register-recent">
                  {registerMovements
                    .filter(
                      (m) =>
                        m.box === balance.box &&
                        m.currency === balance.currency,
                    )
                    .slice(-5)
                    .reverse()
                    .map((m) => (
                      <article className="tl-mobile-card" key={m.id}>
                        <b>
                          {m.type} · {recordNumber(m.id)}
                        </b>
                        <FinanceDetails
                          items={[
                            ["التاريخ", m.date],
                            ["المبلغ", `${fmt(m.amount)} ${m.currency}`],
                            [
                              "الاتجاه",
                              m.incoming
                                ? "داخل"
                                : m.outgoing
                                  ? "خارج"
                                  : "غير مُرحّلة",
                            ],
                            ["الحالة", m.status],
                            ["الرصيد", fmt(m.balance)],
                          ]}
                        />
                      </article>
                    ))}
                </div>
              </>
            )
          )}
        </FinanceModal>
      )}
    </motion.div>}</AnimatePresence></div>
  );
}
