import {recordNumber} from '../data/displayNumbers';
import {useCurrencies} from '../data/currencyStore';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import Icon from "../components/Icon";
import { demoDay, offices, useTransferRecords } from "../data/transferRecords";
import type { TransferRecord } from "../data/transferRecords";
import { RecordModal } from "./TransferList";
import type { Action } from "./TransferList";
import "./transferList.css";
const empty = {
  id: "",
  sender: "",
  recipient: "",
  direction: "",
  currency: "",
  office: "",
  from: "",
  to: "",
};
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
function waiting(row: TransferRecord) {
  const hours = Math.max(
    0,
    Math.floor(
      (Date.now() -
        Date.parse(row.date)) /
        3600000,
    ),
  );
  return hours >= 24
    ? `${Math.floor(hours / 24)} يوم و${hours % 24} ساعة`
    : `${hours} ساعة`;
}
export default function PendingTransfers() {
  const [expanded,setExpanded]=useState(false);const reduced=useReducedMotion();
  const currencies=useCurrencies();
  const records = useTransferRecords();
  const [filters, setFilters] = useState({ ...empty });
  const [selected, setSelected] = useState<{
    id: string;
    action: Action;
  } | null>(null);
  const [page, setPage] = useState(1);
  const badDates = !!(filters.from && filters.to && filters.from > filters.to);
  const rows = records.filter(
    (r) =>
      !["مسلمة", "ملغاة"].includes(r.status) &&
      !badDates &&
      r.id.toLowerCase().includes(filters.id.trim().toLowerCase()) &&
      r.sender.includes(filters.sender.trim()) &&
      r.recipient.includes(filters.recipient.trim()) &&
      (!filters.direction || r.direction === filters.direction) &&
      (!filters.currency || r.currency === filters.currency) &&
      (!filters.office || r.office === filters.office) &&
      (!filters.from || r.date.slice(0, 10) >= filters.from) &&
      (!filters.to || r.date.slice(0, 10) <= filters.to),
  );
  const oldest = [...rows].sort((a, b) => a.date.localeCompare(b.date))[0];
  const pages = Math.max(1, Math.ceil(rows.length / 5));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * 5, current * 5);
  const record = records.find((r) => r.id === selected?.id);
  function set(key: keyof typeof empty, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function actions(r: TransferRecord) {
    return (
      <div className="tl-row-actions">
        {(
          [
            ["details", "عرض التفاصيل"],
            ["deliver", "تسجيل تسليم محلي"],
            ["status", "تعديل الحالة"],
            ["print", "طباعة"],
          ] as const
        ).map(([action, title]) => (
          <button
            key={action}
            onClick={() => setSelected({ id: r.id, action })}
          >
            {title}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="transfer-list">
      <nav className="breadcrumb">
        <Link to="/dashboard">الرئيسية</Link>
        <span> / الحوالات / غير المسلمة</span>
      </nav>
      <PageHeader
        title="الحوالات غير المسلمة / المعلقة"
        description="تابع الحوالات المنتظرة وقيد المعالجة والمراجعة من مكان واحد."
      >
        <span className="page-icon">
          <Icon name="clock" size={26} />
        </span>
      </PageHeader>
      <p className="tl-disclaimer">
        سجلات محفوظة محليًا. مدة الانتظار محسوبة حتى {demoDay}
        حسب وقت الجهاز.
      </p>
      <button className="tl-button primary" aria-expanded={expanded} aria-controls="pending-list" onClick={()=>{setExpanded(!expanded);setSelected(null);}}>الحوالات غير المستلمة / المعلقة {expanded?"−":"+"}</button><AnimatePresence initial={false}>{expanded&&<motion.div id="pending-list" initial={reduced?false:{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={reduced?{opacity:0}:{height:0,opacity:0}} transition={{duration:reduced?0:.18}} style={{overflow:"hidden"}}>
      <div className="panel tl-filters">
        <div className="tl-filter-grid">
          {(
            [
              ["id", "رقم الحوالة"],
              ["sender", "اسم المرسل"],
              ["recipient", "اسم المستفيد"],
              ["from", "من تاريخ"],
              ["to", "إلى تاريخ"],
            ] as const
          ).map(([key, label]) => (
            <label className="tl-field" key={key}>
              <span>{label}</span>
              <input
                aria-label={label}
                type={key === "from" || key === "to" ? "date" : "text"}
                value={filters[key]}
                onInput={(e) => set(key, e.currentTarget.value)}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
          {(
            [
              [
                "direction",
                "النوع",
                [
                  ["incoming", "واردة"],
                  ["outgoing", "صادرة"],
                ],
              ],
              [
                "currency",
                "العملة",
                currencies.map(c=>[c.code,`${c.label} · ${c.code}`]),
              ],
              ["office", "المكتب/الشريك", offices.map((o) => [o, o])],
            ] as const
          ).map(([key, label, options]) => (
            <label className="tl-field" key={key}>
              <span>{label}</span>
              <select
                aria-label={label}
                value={filters[key]}
                onChange={(e) => set(key, e.target.value)}
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
        </div>
        {badDates && (
          <p role="alert" className="tl-error">
            تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.
          </p>
        )}
        <div className="tl-filter-actions">
          <button
            className="tl-button"
            onClick={() => {
              setFilters({ ...empty });
              setPage(1);
            }}
          >
            مسح الفلاتر
          </button>
        </div>
      </div>
      <div className="tl-stats">
        <article className="panel">
          <small>عدد الحوالات المعلقة</small>
          <b className="tl-stat-number">{rows.length}</b>
        </article>
        <article className="panel">
          <small>إجمالي مبالغها</small>
          <div className="tl-currency-totals">
            {currencies.map(c=>c.code).map((currency) => (
              <span key={currency}>
                <b>
                  {number(
                    rows
                      .filter((r) => r.currency === currency)
                      .reduce((s, r) => s + r.amount, 0),
                  )}
                </b>
                <small>{currency}</small>
              </span>
            ))}
          </div>
        </article>
        <article className="panel">
          <small>أقدم حوالة معلقة</small>
          <b dir="ltr">{oldest?.date.replace("T", " · ") || "—"}</b>
          <span>{oldest?.id || "لا توجد حوالات"}</span>
        </article>
        <article className="panel">
          <small>حوالات اليوم غير المسلمة</small>
          <b className="tl-stat-number">
            {rows.filter((r) => r.date.startsWith(demoDay)).length}
          </b>
        </article>
      </div>
      <p className="tl-summary-note">
        الإحصائيات حسب الفلاتر. المبالغ منفصلة حسب العملة، والتسليم أو الإلغاء
        يزيل الحوالة من هذه القائمة.
      </p>
      <section className="panel tl-results">
        <div className="panel-heading">
          <h2>قائمة المتابعة</h2>
          <span className="eyebrow">{rows.length} حوالة</span>
        </div>
        {!rows.length ? (
          <div className="tl-empty">
            <Icon name="clock" size={32} />
            <h2>لا توجد حوالات مطابقة</h2>
            <p>جرّب تغيير الفلاتر.</p>
          </div>
        ) : (
          <>
            <div
              className="tl-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="جدول الحوالات المعلقة"
            >
              <table>
                <thead>
                  <tr>
                    {[
                      "رقم الحوالة",
                      "النوع",
                      "التاريخ",
                      "المرسل",
                      "المستفيد",
                      "المكتب/الشريك",
                      "المبلغ",
                      "العملة",
                      "مدة الانتظار",
                      "الحالة",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td dir="ltr">{recordNumber(r.id)}</td>
                      <td>{r.direction === "incoming" ? "واردة" : "صادرة"}</td>
                      <td dir="ltr">{r.date.replace("T", " · ")}</td>
                      <td>{r.sender}</td>
                      <td>{r.recipient}</td>
                      <td>{r.office}</td>
                      <td>{number(r.amount)}</td>
                      <td>{r.currency}</td>
                      <td>{waiting(r)}</td>
                      <td>
                        <span className="tl-badge pending">{r.status}</span>
                      </td>
                      <td>{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tl-mobile-cards">
              {visible.map((r) => (
                <article className="tl-mobile-card" key={r.id}>
                  <header>
                    <b dir="ltr">{recordNumber(r.id)}</b>
                    <span className="tl-badge pending">{r.status}</span>
                  </header>
                  <small>
                    {r.direction === "incoming" ? "واردة" : "صادرة"} ·{" "}
                    {r.date.replace("T", " · ")}
                  </small>
                  <dl>
                    {[
                      ["المرسل", r.sender],
                      ["المستفيد", r.recipient],
                      ["المكتب", r.office],
                      ["المبلغ", `${number(r.amount)} ${r.currency}`],
                      ["مدة الانتظار", waiting(r)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {actions(r)}
                </article>
              ))}
            </div>
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
          </>
        )}
      </section>
      </motion.div>}</AnimatePresence>
      {selected && record && (
        <RecordModal
          key={`${selected.id}-${selected.action}`}
          row={record}
          action={selected.action}
          close={() => setSelected(null)}
        />
      )}
    </div>
  );
}
