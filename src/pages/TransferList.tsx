import {recordNumber} from '../data/displayNumbers';
import {localDate} from '../data/localStore';
import {useCurrencies} from '../data/currencyStore';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import Icon from "../components/Icon";
import {
  demoDay,
  incomingStatuses,
  offices,
  outgoingStatuses,
  updateTransfer,
  useTransferRecords,
} from "../data/transferRecords";
import type { TransferRecord } from "../data/transferRecords";
import "./transferList.css";
type Mode = "outgoing" | "incoming" | "search";
export type Action =
  "details" | "edit" | "cancel" | "deliver" | "notes" | "print" | "status";
const emptyFilters = {
  quick: "",
  id: "",
  sender: "",
  recipient: "",
  phone: "",
  office: "",
  direction: "",
  currency: "",
  status: "",
  from: "",
  to: "",
};
type Filters = typeof emptyFilters;
const format = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const dateText = (date: string) => date.replace("T", " · ");
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="tl-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function DetailRows({ row }: { row: TransferRecord }) {
  return (
    <dl className="tl-details">
      {[
        ["رقم الحوالة", recordNumber(row.id)],
        ["النوع", row.direction === "outgoing" ? "صادرة" : "واردة"],
        ["التاريخ", dateText(row.date)],
        ["المرسل", row.sender],
        ["هاتف المرسل", row.senderPhone],
        ["عنوان المرسل", row.senderAddress],
        ["المستفيد", row.recipient],
        ["هاتف المستفيد", row.recipientPhone],
        ["عنوان المستفيد", row.recipientAddress],
        ["المبلغ", `${format(row.amount)} ${row.currency}`],
        ["العمولة", `${format(row.commission)} ${row.currency}`],
        ["المكتب/الشريك", row.office],
        ["الحالة", row.status],
        ["تاريخ التسليم", row.deliveredAt ? dateText(row.deliveredAt) : "—"],
        ["سبب الحوالة", row.reason],
        ["الصك أو القسيمة", row.voucher],
        ["الملاحظات", row.notes || "—"],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function RecordModal({
  row,
  action,
  close,
}: {
  row: TransferRecord;
  action: Action;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({
    sender: row.sender,
    recipient: row.recipient,
    amount: String(row.amount),
    commission: String(row.commission),
    notes: row.notes,
    status: row.status,
    deliveredAt: localDate(),
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const titles: Record<Action, string> = {
    details: "تفاصيل الحوالة",
    edit: "تعديل محلي",
    cancel: "تأكيد الإلغاء المحلي",
    deliver: "تسجيل تسليم محلي",
    notes: "ملاحظات الحوالة",
    print: "معاينة طباعة الحوالة",
    status: "تعديل الحالة المحلية",
  };
  const editable = action === "edit";
  const noteField = editable || action === "deliver" || action === "notes";
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      editable &&
      (!draft.sender.trim() ||
        !draft.recipient.trim() ||
        !Number.isFinite(Number(draft.amount)) ||
        Number(draft.amount) <= 0 ||
        Number(draft.amount) > 1e12 ||
        draft.commission === "" ||
        !Number.isFinite(Number(draft.commission)) ||
        Number(draft.commission) < 0 ||
        Number(draft.commission) > 1e12)
    ) {
      setError(
        "أدخل الاسمين ومبلغًا موجبًا وعمولة غير سالبة، بحد أقصى تريليون.",
      );
      return;
    }
    if (
      action === "deliver" &&
      (!draft.deliveredAt || draft.deliveredAt < row.date)
    ) {
      setError("اختر تاريخ تسليم لا يسبق تاريخ الحوالة.");
      return;
    }
    let ok=true;
    if(editable)ok=updateTransfer(row.id,{sender:draft.sender.trim(),recipient:draft.recipient.trim(),amount:Number(draft.amount),commission:Number(draft.commission),notes:draft.notes});
    if(action==='notes')ok=updateTransfer(row.id,{notes:draft.notes});
    if(action==='status')ok=updateTransfer(row.id,{status:draft.status,deliveredAt:draft.status==='مسلمة'?(row.deliveredAt||localDate()):''});
    if(action==='cancel')ok=updateTransfer(row.id,{status:'ملغاة'});
    if(action==='deliver')ok=updateTransfer(row.id,{status:'مسلمة',deliveredAt:draft.deliveredAt,notes:draft.notes});
    if(!ok){setError('تعذر حفظ التعديل محليًا.');return;}
    if(action==='deliver')window.dispatchEvent(new CustomEvent('premium-success',{detail:'تم تسليم الحوالة محليًا.'}));
    close();
  }
  return (
    <dialog
      ref={ref}
      className={`tl-modal ${action === "print" ? "tl-print-modal" : ""}`}
      aria-labelledby="tl-modal-title"
      onCancel={close}
    >
      <div className="tl-modal-heading">
        <div>
          <span className="eyebrow">{recordNumber(row.id)}</span>
          <h2 id="tl-modal-title">{titles[action]}</h2>
        </div>
        <button
          className="tl-button"
          onClick={close}
          aria-label="إغلاق التفاصيل"
        >
          إغلاق
        </button>
      </div>
      <p className="tl-disclaimer">
        بيانات محلية فقط · لا يتم تنفيذ حركة مالية أو إرسال بيانات.
      </p>
      <form onSubmit={submit} noValidate>
        {editable ? (
          <div className="tl-edit-grid">
            {(
              [
                ["sender", "اسم المرسل"],
                ["recipient", "اسم المستفيد"],
                ["amount", "المبلغ"],
                ["commission", "العمولة"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  value={draft[key]}
                  required
                  type={
                    key === "amount" || key === "commission" ? "number" : "text"
                  }
                  step="any"
                  maxLength={120}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
        ) : (
          <DetailRows row={row} />
        )}
        {action === "status" && (
          <Field label="الحالة الجديدة">
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value }))
              }
            >
              {(row.direction === "incoming"
                ? incomingStatuses
                : outgoingStatuses
              )
                .map((status) => (
                  <option key={status}>{status}</option>
                ))}
            </select>
          </Field>
        )}
        {action === "deliver" && (
          <Field label="تاريخ التسليم">
            <input
              type="datetime-local"
              onInput={(e) => {
                const value = e.currentTarget.value;
                setDraft((d) => ({ ...d, deliveredAt: value }));
              }}
              required
              min={row.date}
              value={draft.deliveredAt}
              onChange={(e) =>
                setDraft((d) => ({ ...d, deliveredAt: e.target.value }))
              }
            />
          </Field>
        )}
        {noteField && (
          <Field label="الملاحظات">
            <textarea
              rows={3}
              maxLength={1000}
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </Field>
        )}
        {action === "cancel" && (
          <p className="tl-disclaimer">
            سيتم تغيير الحالة إلى «ملغاة» داخل البيانات المحلية المحفوظة على المتصفح
            فقط.
          </p>
        )}
        {error && (
          <p className="tl-error" role="alert">
            {error}
          </p>
        )}
        <div className="tl-modal-actions">
          {action === "print" ? (
            <button
              type="button"
              className="tl-button primary"
              onClick={() => window.print()}
            >
              طباعة الإيصال
            </button>
          ) : (
            action !== "details" && (
              <button className="tl-button primary" type="submit">
                {action === "deliver"
                  ? "تأكيد التسليم المحلي"
                  : action === "cancel"
                    ? "تأكيد الإلغاء"
                    : "حفظ التعديل"}
              </button>
            )
          )}
          <button type="button" className="tl-button" onClick={close}>
            رجوع
          </button>
        </div>
      </form>
    </dialog>
  );
}
export function TransferStatusSelect({row}: {row: TransferRecord}) {
  return <select className="tl-status-select" aria-label={`حالة الحوالة ${row.id}`} value={row.status} onChange={event => updateTransfer(row.id, {status: event.target.value, deliveredAt: event.target.value === 'مسلمة' ? (row.deliveredAt || new Date().toISOString().slice(0,16)) : ''})}>
    {(row.direction === 'incoming' ? incomingStatuses : outgoingStatuses).map(status => <option key={status}>{status}</option>)}
  </select>;
}
export default function TransferList({ mode }: { mode: Mode }) {
  const currencies=useCurrencies();
  const records = useTransferRecords();
  const [expanded,setExpanded]=useState(false); const reduced=useReducedMotion();
  const search = mode === "search";
  const incoming = mode === "incoming";
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{
    id: string;
    action: Action;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const title = search
    ? "البحث عن حوالة"
    : incoming
      ? "الحوالات الواردة"
      : "الحوالات الصادرة";
  const statuses = search
    ? [...new Set([...outgoingStatuses, ...incomingStatuses])]
    : incoming
      ? incomingStatuses
      : outgoingStatuses;
  const badDates = !!(filters.from && filters.to && filters.from > filters.to);
  const source = records.filter((r) => search || r.direction === mode);
  const includes = (value: string, query: string) =>
    value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const filtered = badDates
    ? []
    : source.filter(
        (r) =>
          includes(`${recordNumber(r.id)} ${r.sender} ${r.recipient} ${r.senderPhone} ${r.recipientPhone}`, filters.quick) &&
          includes(recordNumber(r.id), filters.id) &&
          includes(r.sender, filters.sender) &&
          includes(r.recipient, filters.recipient) &&
          includes(`${r.senderPhone} ${r.recipientPhone}`, filters.phone) &&
          (!filters.office || r.office === filters.office) &&
          (!filters.direction || r.direction === filters.direction) &&
          (!filters.currency || r.currency === filters.currency) &&
          (!filters.status || r.status === filters.status) &&
          (!filters.from || r.date.slice(0, 10) >= filters.from) &&
          (!filters.to || r.date.slice(0, 10) <= filters.to),
      );
  const count = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, count);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const current = selected
    ? records.find((r) => r.id === selected.id)
    : undefined;
  function filter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function input(key: keyof Filters, label: string, type = "text") {
    return (
      <Field label={label}>
        <input
          type={type}
          value={filters[key]}
          onInput={(e) => filter(key, e.currentTarget.value)}
          onChange={(e) => filter(key, e.target.value)}
          placeholder={type === "text" ? label : undefined}
        />
      </Field>
    );
  }
  function select(
    key: keyof Filters,
    label: string,
    options: string[] | { value: string; label: string }[],
  ) {
    return (
      <Field label={label}>
        <select
          value={filters[key]}
          onChange={(e) => filter(key, e.target.value)}
        >
          <option value="">الكل</option>
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.value}
              value={typeof o === "string" ? o : o.value}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  function total(key: "amount" | "commission") {
    const active = filtered.filter((r) => r.status !== "ملغاة");
    return (
      <div className="tl-currency-totals">
        {["USD", "IQD", "IRT"].map((currency) => (
          <span key={currency}>
            <b dir="ltr">
              {format(
                active
                  .filter((r) => r.currency === currency)
                  .reduce((sum, r) => sum + r[key], 0),
              )}
            </b>
            <small>{currency}</small>
          </span>
        ))}
      </div>
    );
  }
  function actions(row: TransferRecord) {
    const inactive = row.status === "مسلمة" || row.status === "ملغاة";
    return (
      <div className="tl-row-actions">
        <button onClick={() => setSelected({ id: row.id, action: "details" })}>
          {search ? "عرض" : "عرض التفاصيل"}
        </button>
        {!search && (
          <>
            {!incoming && (
              <button
                disabled={inactive}
                onClick={() => setSelected({ id: row.id, action: "edit" })}
              >
                تعديل محلي
              </button>
            )}
            {incoming && (
              <button
                disabled={row.status !== "بانتظار التسليم"}
                onClick={() => setSelected({ id: row.id, action: "deliver" })}
              >
                تسجيل تسليم محلي
              </button>
            )}
            <button
              onClick={() => setSelected({ id: row.id, action: "print" })}
            >
              طباعة
            </button>
            {incoming ? (
              <button
                onClick={() => setSelected({ id: row.id, action: "notes" })}
              >
                ملاحظات
              </button>
            ) : (
              <button
                className="danger"
                disabled={inactive}
                onClick={() => setSelected({ id: row.id, action: "cancel" })}
              >
                إلغاء محلي
              </button>
            )}
          </>
        )}
      </div>
    );
  }
  const headers = search
    ? [
        "رقم الحوالة",
        "النوع",
        "التاريخ",
        "المرسل",
        "المستفيد",
        "المبلغ",
        "العملة",
        "المكتب/الشريك",
        "الحالة",
        "عرض",
      ]
    : incoming
      ? [
          "رقم الحوالة",
          "التاريخ",
          "اسم المرسل",
          "المستفيد",
          "المبلغ",
          "العملة",
          "العمولة إن وجدت",
          "الحالة",
          "الإجراءات",
        ]
      : [
          "رقم الحوالة",
          "التاريخ",
          "المرسل",
          "المستفيد",
          "المبلغ",
          "العملة",
          "العمولة",
          "الشريك/المكتب",
          "الحالة",
          "الإجراءات",
        ];
  function cells(r: TransferRecord): ReactNode[] {
    const common = [
      <b dir="ltr">{recordNumber(r.id)}</b>,
      <span dir="ltr">{dateText(r.date)}</span>,
    ];
    const amount = <b dir="ltr">{format(r.amount)}</b>;
    return search
      ? [
          common[0],
          r.direction === "incoming" ? "واردة" : "صادرة",
          common[1],
          r.sender,
          r.recipient,
          amount,
          r.currency,
          r.office,
          <TransferStatusSelect row={r} />,
          actions(r),
        ]
      : incoming
        ? [
            ...common,
            r.sender,
            r.recipient,
            amount,
            r.currency,
            format(r.commission),
            <TransferStatusSelect row={r} />,
            actions(r),
          ]
        : [
            ...common,
            r.sender,
            r.recipient,
            amount,
            r.currency,
            format(r.commission),
            r.office,
            <TransferStatusSelect row={r} />,
            actions(r),
          ];
  }
  return (
    <div className="transfer-list">
      <nav className="breadcrumb" aria-label="مسار الصفحة">
        <Link to="/dashboard">الرئيسية</Link>
        <Icon name="chevron" size={12} />
        <span>الحوالات</span>
        <Icon name="chevron" size={12} />
        <b>{title}</b>
      </nav>
      <PageHeader
        title={title}
        description={
          search
            ? "ابحث في الحوالات الصادرة والواردة من مكان واحد."
            : incoming
              ? "تابع الحوالات الواردة وحالات التسليم في المكتب."
              : "متابعة الحوالات الصادرة وإدارة حالاتها المحلية."
        }
      >
        <span className="page-icon">
          <Icon name={search ? "search" : "transfer"} size={25} />
        </span>
      <Link className="tl-button primary" to={`/transfers/new${mode==='incoming'?'?direction=incoming':''}`}>تسجيل حوالة {mode==='incoming'?'واردة':'صادرة'}</Link></PageHeader>
      <p className="tl-disclaimer">
        محاكاة محلية · اليوم المحلي: {demoDay} · التعديلات مشتركة بين هذه
        الصفحات وتبقى بعد تحديث المتصفح. تسوية النقد تُسجل بسند قبض أو صرف.
      </p>
      {!search && <div className="panel tl-filters">{input("quick","بحث سريع بالاسم أو رقم الحوالة أو الهاتف")}<button type="button" className="tl-button primary" aria-expanded={expanded} aria-controls="transfer-ledger" onClick={()=>{setExpanded(!expanded);setSelected(null);}}>سجل الحوالات {incoming ? "الواردة" : "الصادرة"} {expanded ? "−" : "+"}</button></div>}
      <AnimatePresence initial={false}>{(search || expanded) && <motion.div key="ledger" id={search ? undefined : "transfer-ledger"} initial={!search&&!reduced?{height:0,opacity:0}:false} animate={{height:"auto",opacity:1}} exit={reduced?{opacity:0}:{height:0,opacity:0}} transition={{duration:reduced?0:.18}} style={!search?{overflow:"hidden"}:undefined}>
      <form
        className="panel tl-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
          setPage(1);
        }}
      >
        <div className="tl-filter-grid">
          {search ? (
            <>
              {input("id", "رقم الحوالة")}
              {input("sender", "اسم المرسل")}
              {input("recipient", "اسم المستفيد")}
              {input("phone", "رقم الهاتف")}
              {select("office", "المكتب/الشريك", offices)}
              {select("direction", "نوع الحوالة", [
                { value: "incoming", label: "واردة" },
                { value: "outgoing", label: "صادرة" },
              ])}
            </>
          ) : (
            null
          )}
          {input("from", "من تاريخ", "date")}
          {input("to", "إلى تاريخ", "date")}
          {select("currency", "العملة", currencies.map(c=>({value:c.code,label:`${c.label} · ${c.code}`})))}
          {select("status", "الحالة", statuses)}
        </div>
        {badDates && (
          <p className="tl-error" role="alert">
            تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.
          </p>
        )}
        <div className="tl-filter-actions">
          {search ? (
            <>
              <button
                className="tl-button primary"
                type="submit"
                disabled={badDates}
              >
                بحث <Icon name="search" size={16} />
              </button>
              <button
                className="tl-button"
                type="button"
                onClick={() => {
                  setFilters({ ...emptyFilters });
                  setSearched(false);
                  setPage(1);
                }}
              >
                مسح الفلاتر
              </button>
              <small>بعد أول بحث، تتحدث النتائج محليًا مع تغيير الفلاتر.</small>
            </>
          ) : (
            <>
              <button
                className="tl-button"
                type="button"
                onClick={() => {
                  setPage(1);
                  setNotice(
                    `تم تحديث العرض من البيانات المحلية · ${new Date().toLocaleTimeString("ar-IQ")}`,
                  );
                }}
              >
                تحديث <Icon name="exchange" size={16} />
              </button>
              <button
                type="button"
                className="tl-button"
                disabled={!filtered.length}
                onClick={() => window.print()}
              >
                طباعة <Icon name="layers" size={16} />
              </button>
              <button
                className="tl-button"
                type="button"
                onClick={() => {
                  setFilters({ ...emptyFilters });
                  setPage(1);
                }}
              >
                مسح الفلاتر
              </button>
            </>
          )}
        </div>
      </form>
      {!search && (
        <>
          <div className="tl-stats">
            <article className="panel">
              <small>
                {incoming ? "حوالات واردة اليوم" : "عدد الحوالات الصادرة اليوم"}
              </small>
              <b className="tl-stat-number">
                {filtered.filter((r) => r.date.startsWith(demoDay)).length}
              </b>
              <span>حسب الفلاتر الحالية</span>
            </article>
            <article className="panel">
              <small>
                {incoming ? "إجمالي المبالغ الواردة" : "إجمالي المبالغ"}
              </small>
              {total("amount")}
            </article>
            <article className="panel">
              <small>
                {incoming ? "الحوالات بانتظار التسليم" : "إجمالي العمولات"}
              </small>
              {incoming ? (
                <b className="tl-stat-number">
                  {
                    filtered.filter((r) => r.status === "بانتظار التسليم")
                      .length
                  }
                </b>
              ) : (
                total("commission")
              )}
            </article>
            <article className="panel">
              <small>
                {incoming ? "الحوالات المسلمة" : "الحوالات المعلقة"}
              </small>
              <b className="tl-stat-number">
                {
                  filtered.filter(
                    (r) => r.status === (incoming ? "مسلمة" : "معلقة"),
                  ).length
                }
              </b>
              <span>حسب الفلاتر الحالية</span>
            </article>
          </div>
          <p className="tl-summary-note">
            الإجماليات مفصّلة حسب العملة وتستثني الحوالات الملغاة.
          </p>
        </>
      )}
      <div className="tl-notice" role="status">
        {notice}
      </div>
      {search && !searched ? (
        <section className="panel tl-empty">
          <Icon name="search" size={38} />
          <h2>ابحث عن الحوالة التي تحتاجها</h2>
          <p>أدخل رقمًا أو اسمًا، أو اضغط بحث لعرض جميع الحوالات المحلية.</p>
        </section>
      ) : (
        <section className="panel tl-results">
          <div className="panel-heading">
            <div>
              <h2>{search ? "نتائج البحث" : "سجل الحوالات"}</h2>
              <p>
                {filtered.length} حوالة · عرض {visible.length} في الصفحة
              </p>
            </div>
            <span className="eyebrow">بيانات محلية</span>
          </div>
          {!filtered.length ? (
            <div className="tl-empty">
              <Icon name="search" size={32} />
              <h2>لا توجد نتائج مطابقة</h2>
              <p>جرّب تغيير الاسم أو توسيع نطاق التاريخ.</p>
            </div>
          ) : (
            <>
              <div
                className="tl-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="جدول الحوالات"
              >
                <table>
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id}>
                        {cells(r).map((cell, i) => (
                          <td key={headers[i]}>{cell}</td>
                        ))}
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
                      <TransferStatusSelect row={r} />
                    </header>
                    <small>
                      {r.direction === "incoming" ? "واردة" : "صادرة"} ·{" "}
                      {dateText(r.date)}
                    </small>
                    <dl>
                      {[
                        ["المرسل", r.sender],
                        ["المستفيد", r.recipient],
                        ["المبلغ", `${format(r.amount)} ${r.currency}`],
                        ["العمولة", `${format(r.commission)} ${r.currency}`],
                        ...(!incoming ? [["المكتب/الشريك", r.office]] : []),
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {actions(r)}
                  </article>
                ))}
              </div>
              <nav className="tl-pagination" aria-label="صفحات الحوالات">
                <button
                  className="tl-button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  السابق
                </button>
                <span>
                  صفحة {currentPage} من {count}
                </span>
                <button
                  className="tl-button"
                  disabled={currentPage === count}
                  onClick={() => setPage(currentPage + 1)}
                >
                  التالي
                </button>
              </nav>
            </>
          )}
        </section>
      )}
      </motion.div>}</AnimatePresence>
      <section className="tl-print-list">
        <h1>{title} · نسخة محلية</h1>
        <p>
          {filtered.length} حوالة مطابقة للفلاتر · {demoDay} · غير صالح للتعامل
          المالي
        </p>
        {filtered.map((r) => (
          <article key={r.id}>
            <h2>{recordNumber(r.id)}</h2>
            <DetailRows row={r} />
          </article>
        ))}
      </section>
      {selected && current && (
        <RecordModal
          key={`${selected.id}-${selected.action}`}
          row={current}
          action={selected.action}
          close={() => {
            setSelected(null);
            setNotice("تم تحديث العرض المحلي.");
          }}
        />
      )}
    </div>
  );
}
