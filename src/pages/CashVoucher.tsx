import {postCashVoucher} from '../data/cashLedger';
import {useCurrencies} from '../data/currencyStore';
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { FinanceModal, FinanceDetails } from "../components/FinanceViews";
import { useCustomers } from "../data/customerRecords";

import "./financePages.css";
import "./cashbox.css";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
function localTime() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function empty() {
  return {
    date: localTime(),
    party: "",
    partyType: "عميل",
    currency: "",
    amount: "",
    reason: "",
    reference: "",
    description: "",
    notes: "",
  };
}
type Values = ReturnType<typeof empty>;
type Snapshot = Values & { id: string };
export default function CashVoucher({
  payment = false,
}: {
  payment?: boolean;
}) {
  const currencies=useCurrencies();
  const navigate = useNavigate();
  const customers = useCustomers();
  const title = payment ? "سند صرف" : "سند قبض";
  const [id,setId] = useState(
    () =>
      `${payment ? "PAY" : "REC"}-${crypto.randomUUID().toUpperCase()}`,
  );
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );
  const [saved, setSaved] = useState<Snapshot | null>(null);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const currencyValid = currencies.some(c=>c.code===values.currency);
  const parties =
    values.partyType === "عميل"
      ? customers.map((c) => c.name)
      : values.partyType === "شريك"
        ? []
        : [];
  function change(key: keyof Values, value: string) {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "partyType" ? { party: "" } : {}),
    }));
    setErrors((e) => ({
      ...e,
      [key]: undefined,
      ...(key === "partyType" ? { party: undefined } : {}),
    }));
    setSaved(null);
    setMessage("");
  }
  function validate() {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.party.trim()) next.party = "الطرف مطلوب.";
    if (!currencyValid) next.currency = "اختر العملة.";
    if (
      !values.amount ||
      !Number.isFinite(Number(values.amount)) ||
      Number(values.amount) <= 0 ||
      Number(values.amount) > 1e12
    )
      next.amount = "أدخل مبلغًا أكبر من صفر وحتى تريليون.";
    if (!values.date || !Number.isFinite(Date.parse(values.date)))
      next.date = "حدد تاريخًا ووقتًا صالحين.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`voucher-${first}`)?.focus();
      return false;
    }
    return true;
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    const matches=customers.filter(c=>c.name===values.party.trim());
    const posted={...values,party:values.party.trim(),id,customerId:values.partyType==='عميل'&&matches.length===1?matches[0].id:undefined};
    try {postCashVoucher({...posted,amount:Number(posted.amount),type:payment?'صرف':'قبض'});} catch(error){setMessage(error instanceof Error?error.message:'تعذر حفظ السند.');return;}
    setSaved(posted);
    setMessage(
      "تم حفظ السند وتحديث رصيد الصندوق الرئيسي وسجل حركاته محليًا. إعادة حفظ نفس السند لا تضاعف المبلغ.",
    );
    if (
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "print"
    )
      setPreview(true);
  }
  function field(
    key: keyof Values,
    label: string,
    type = "text",
    required = false,
  ) {
    return (
      <label className="tl-field" htmlFor={`voucher-${key}`}>
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        <input
          id={`voucher-${key}`}
          aria-label={label}
          type={type}
          required={required}
          value={values[key]}
          readOnly={key === "date"} onChange={key === "date" ? undefined : (e) => change(key, e.target.value)}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? 1e12 : undefined}
          step={type === "number" ? "any" : undefined}
          maxLength={type === "text" ? 180 : undefined}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `voucher-error-${key}` : undefined}
        />
        {errors[key] && (
          <small id={`voucher-error-${key}`} className="tl-error">
            {errors[key]}
          </small>
        )}
      </label>
    );
  }
  return (
    <div className="finance-page cash-voucher">
      <nav className="breadcrumb">
        <Link to="/dashboard">الرئيسية</Link>
        <Link to="/cashbox"> / الصندوق</Link>
        <span> / {title}</span>
      </nav>
      <PageHeader
        title={title}
        description={`إعداد ${title} محلي ومراجعة بياناته قبل الحفظ.`}
      />
      <p className="tl-disclaimer">
        القبض يزيد رصيد الصندوق الرئيسي والصرف ينقصه بالعملة المختارة. الحفظ محلي على هذا المتصفح، ويبقى بعد تحديث المتصفح وإغلاقه.
      </p>
      <div className="panel voucher-meta">
        <div>
          <small>رقم السند المحلي</small>
          <b dir="ltr">{id}</b>
        </div>
        <span className={`tl-badge ${saved ? "done" : "review"}`}>
          {saved ? "محفوظ محليًا" : "مسودة"}
        </span>
      </div>
      <form noValidate onSubmit={submit}>
        <section className="panel voucher-section">
          <h2>بيانات {title}</h2>
          <div className="voucher-grid">
            {field("date", "التاريخ والوقت", "datetime-local", true)}
            <label className="tl-field">
              <span>نوع الطرف</span>
              <select
                aria-label="نوع الطرف"
                value={values.partyType}
                onChange={(e) => change("partyType", e.target.value)}
              >
                {["عميل", "شريك", "أخرى"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="tl-field" htmlFor="voucher-party">
              <span>الطرف *</span>
              <input
                id="voucher-party"
                aria-label="الطرف"
                list="voucher-parties"
                value={values.party}
                onChange={(e) => change("party", e.target.value)}
                required
                maxLength={160}
                placeholder="اسم الطرف أو اختيار اسم محلي"
                aria-invalid={!!errors.party}
                aria-describedby={
                  errors.party ? "voucher-party-error" : undefined
                }
              />
              <datalist id="voucher-parties">
                {parties.map((p) => (
                  <option value={p} key={p} />
                ))}
              </datalist>
              {errors.party && (
                <small className="tl-error" id="voucher-party-error">
                  {errors.party}
                </small>
              )}
            </label>
            <label className="tl-field" htmlFor="voucher-currency">
              <span>العملة *</span>
              <select
                id="voucher-currency"
                aria-label="العملة"
                value={values.currency}
                onChange={(e) => change("currency", e.target.value)}
                required
                aria-invalid={!!errors.currency}
                aria-describedby={
                  errors.currency ? "voucher-currency-error" : undefined
                }
              >
                <option value="">اختر العملة</option>
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.label} · {c.code}</option>
                ))}
              </select>
              {errors.currency && (
                <small className="tl-error" id="voucher-currency-error">
                  {errors.currency}
                </small>
              )}
            </label>
            {field("amount", "المبلغ", "number", true)}
            {field("reason", payment ? "سبب الصرف" : "سبب القبض")}
            {field("reference", "رقم المرجع إن وجد")}
            {field("description", "البيان")}
            <label className="tl-field voucher-notes">
              <span>الملاحظات</span>
              <textarea
                aria-label="الملاحظات"
                rows={3}
                maxLength={1000}
                value={values.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </label>
          </div>
        </section>

        <p className={message.startsWith("لم")||message.startsWith("تعذر")?"tl-error":"tl-notice"} role={message.startsWith("لم")||message.startsWith("تعذر")?"alert":"status"}>
          {message}
        </p>
        <div className="panel voucher-actions">
          <button type="submit" value="save" className="tl-button primary">
            حفظ محلي
          </button>
          <button type="submit" value="print" className="tl-button">
            حفظ وطباعة
          </button>
          <button
            type="button"
            className="tl-button"
            onClick={() => {
              setId(`${payment ? "PAY" : "REC"}-${crypto.randomUUID().toUpperCase()}`);
              setValues(empty());
              setErrors({});
              setSaved(null);
              setMessage("تم بدء سند جديد؛ السندات المحفوظة تبقى في سجل الصندوق.");
              document.getElementById("voucher-party")?.focus();
            }}
          >
            مسح
          </button>
          <button
            type="button"
            className="tl-button"
            onClick={() => navigate("/cashbox")}
          >
            إلغاء
          </button>
        </div>
      </form>
      {preview && saved && (
        <FinanceModal
          title={`معاينة طباعة ${title}`}
          close={() => setPreview(false)}
        >
          <div className="voucher-print">
            <h2>{title} · نسخة محلية</h2>
            <p className="tl-disclaimer">
              سند محلي محلي مُسجل في الصندوق الرئيسي. لا يمثل عملية مالية خارج التطبيق.
            </p>
            <FinanceDetails
              items={[
                ["رقم السند", saved.id],
                ["التاريخ والوقت", saved.date.replace("T", " · ")],
                ["الطرف", saved.party],
                ["نوع الطرف", saved.partyType],
                ["العملة", saved.currency],
                ["المبلغ", fmt(Number(saved.amount))],
                [payment ? "سبب الصرف" : "سبب القبض", saved.reason || "—"],
                ["المرجع", saved.reference || "—"],
                ["البيان", saved.description || "—"],
                ["الملاحظات", saved.notes || "—"],

              ]}
            />
            <button
              className="tl-button primary voucher-print-button"
              onClick={() => window.print()}
            >
              طباعة الإيصال المحلي
            </button>
          </div>
        </FinanceModal>
      )}
    </div>
  );
}

