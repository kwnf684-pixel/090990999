import {useCurrencies} from '../data/currencyStore';
import { useEffect, useRef, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { PageHeader, StatusBadge } from "../components/ui";
import {saveTransfer} from '../data/transferRecords';
import {localDate} from '../data/localStore';
import {useSearchParams} from 'react-router-dom';
import "./newTransfer.css";

const blank = {
  sender: "",
  senderPhone: "",
  senderAddress: "",
  recipient: "",
  recipientPhone: "",
  recipientAddress: "",
  amount: "",
  currency: "",
  commission: "0",
};
type Values = typeof blank;
type Errors = Partial<Record<keyof Values, string>>;
const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
function Section({
  title,
  icon,
  step,
  children,
}: {
  title: string;
  icon: string;
  step: string;
  children: ReactNode;
}) {
  return (
    <section className="panel transfer-section">
      <div className="transfer-section-heading">
        <span className="icon-tile teal">
          <Icon name={icon} />
        </span>
        <h2>{title}</h2>
        <span className="section-step">{step}</span>
      </div>
      {children}
    </section>
  );
}
export default function NewTransfer() {
  const currencies=useCurrencies();
  const [query]=useSearchParams();const incoming=query.get('direction')==='incoming';
  const [transferId,setTransferId]=useState(()=>`${incoming?'IN':'OUT'}-${crypto.randomUUID()}`);
  const [values, setValues] = useState<Values>({ ...blank });
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [preview, setPreview] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);
  const amount = Number.isFinite(Number(values.amount))
    ? Math.min(1e12, Math.max(0, Number(values.amount)))
    : 0;
  const currency = currencies.find(
    (c) => c.code === values.currency,
  );
  const commission = Number.isFinite(Number(values.commission)) ? Math.max(0, Number(values.commission)) : 0;
  const dateLabel = timestamp.toLocaleString("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  function change(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSaved(false);
    setMessage("");
  }
  function field(
    key: keyof Values,
    label: string,
    options: {
      type?: string;
      required?: boolean;
      placeholder?: string;
      wide?: boolean;
      min?: number;
      max?: number;
    } = {},
  ) {
    return (
      <div className={`transfer-field ${options.wide ? "field-wide" : ""}`}>
        <label htmlFor={`transfer-${key}`}>
          {label}
          {options.required && <span className="required-mark"> *</span>}
        </label>
        <input
          id={`transfer-${key}`}
          name={key}
          value={values[key]}
          onChange={(e) => change(key, e.target.value)}
          type={options.type || "text"}
          inputMode={
            options.type === "number"
              ? "decimal"
              : options.type === "tel"
                ? "tel"
                : undefined
          }
          dir={
            options.type === "number" || options.type === "tel"
              ? "ltr"
              : undefined
          }
          required={options.required}
          min={options.min}
          max={options.max}
          step={options.type === "number" ? "any" : undefined}
          maxLength={options.type === "number" ? undefined : 160}
          placeholder={options.placeholder}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `error-${key}` : undefined}
        />
        {errors[key] && (
          <small id={`error-${key}`} className="field-error">
            {errors[key]}
          </small>
        )}
      </div>
    );
  }
  function validate() {
    const next: Errors = {};
    if (!values.sender.trim()) next.sender = "أدخل اسم المرسل";
    if (!values.recipient.trim()) next.recipient = "أدخل اسم المستفيد";
    if (
      !values.amount ||
      !Number.isFinite(Number(values.amount)) ||
      Number(values.amount) <= 0 ||
      Number(values.amount) > 1e12
    )
      next.amount = "أدخل مبلغًا أكبر من صفر وحتى 1,000,000,000,000";
    if (!currency) next.currency = "اختر عملة الحوالة";
    if (!values.commission.trim() || !Number.isFinite(Number(values.commission)) || Number(values.commission)<0 || Number(values.commission)>1e12) next.commission="أدخل عمولة يدوية من صفر إلى تريليون";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      setMessage("راجع الحقول المحددة قبل الحفظ.");
      document.getElementById(`transfer-${first}`)?.focus();
      return false;
    }
    return true;
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if(!saveTransfer({...values,id:transferId,direction:incoming?'incoming':'outgoing',date:localDate(),amount,commission,office:'',status:incoming?'بانتظار التسليم':'معلقة',notes:'',reason:'',voucher:'',deliveredAt:''}))return;
    setSaved(true);
    setMessage(
      "تم حفظ الحوالة في السجل المحلي. لا يُحرّك تسجيل الحوالة النقد؛ سجّل القبض أو الصرف بسند عند استلام أو تسليم النقد.",
    );
    if (
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "print"
    )
      setPreview(true);
  }
  function clear() {
    setTransferId(`${incoming?'IN':'OUT'}-${crypto.randomUUID()}`);
    setValues({ ...blank });
    setErrors({});
    setSaved(false);
    setMessage("تم مسح الحقول.");
    setTimestamp(new Date());
    document.getElementById("transfer-sender")?.focus();
  }
  return (
    <div className="new-transfer">
      <nav className="breadcrumb" aria-label="مسار الصفحة">
        <Link to="/dashboard">الرئيسية</Link>
        <Icon name="chevron" size={12} />
        <span>الحوالات</span>
        <Icon name="chevron" size={12} />
        <b>إرسال حوالة جديدة</b>
      </nav>
      <PageHeader
        title={incoming?"تسجيل حوالة واردة":"إرسال حوالة جديدة"}
        description="أدخل بيانات الحوالة وراجع الملخص قبل حفظ النسخة المحلية."
      >
        <span className="page-icon">
          <Icon name="transfer" size={25} />
        </span>
      </PageHeader>
      <div className="transfer-meta panel">
        <div>
          <small>رقم الحوالة المحلي</small>
          <b dir="ltr">{transferId}</b>
        </div>
        <div>
          <small>التاريخ والوقت</small>
          <b>{dateLabel}</b>
        </div>
        <div>
          <small>حالة الحوالة</small>
          <StatusBadge status={saved ? "محفوظة محليًا" : "مسودة"} />
        </div>
        <span className="transfer-demo">
          <Icon name="shield" size={16} />
          سجلات محلية محفوظة
        </span>
      </div>
      <form noValidate onSubmit={save} className="transfer-form">
        <div className="transfer-parties">
          <Section title="بيانات المرسل" icon="user" step="01">
            <div className="transfer-fields party-fields">
              {field("sender", "اسم المرسل", {
                required: true,
                placeholder: "الاسم الكامل",
                wide: true,
              })}
              {field("senderPhone", "رقم هاتف المرسل", {
                type: "tel",
                placeholder: "07xx xxx xxxx",
              })}
              {field("senderAddress", "العنوان", {
                placeholder: "المدينة، المنطقة",
              })}
            </div>
          </Section>
          <Section title="بيانات المستفيد" icon="users" step="02">
            <div className="transfer-fields party-fields">
              {field("recipient", "اسم المستفيد", {
                required: true,
                placeholder: "الاسم الكامل",
                wide: true,
              })}
              {field("recipientPhone", "رقم هاتف المستفيد", {
                type: "tel",
                placeholder: "07xx xxx xxxx",
              })}
              {field("recipientAddress", "عنوان المستفيد", {
                placeholder: "المدينة، المنطقة",
              })}
            </div>
          </Section>
        </div>
        <Section title="بيانات الحوالة" icon="transfer" step="03">
          <div className="transfer-fields">
            {field("amount", "مبلغ الحوالة", {
              type: "number",
              required: true,
              min: 0,
              max: 1e12,
              placeholder: "0.00",
            })}
            <div className="transfer-field">
              <label htmlFor="transfer-currency">
                العملة <span className="required-mark">*</span>
              </label>
              <select
                id="transfer-currency"
                required
                value={values.currency}
                onChange={(e) => change("currency", e.target.value)}
                aria-invalid={!!errors.currency}
                aria-describedby={
                  errors.currency ? "error-currency" : undefined
                }
              >
                <option value="">اختر العملة</option>
                {currencies.map((c) => (
                  <option value={c.code} key={c.code}>
                    {c.label} · {c.code}
                  </option>
                ))}
              </select>
              {errors.currency && (
                <small id="error-currency" className="field-error">
                  {errors.currency}
                </small>
              )}
            </div>
            {field("commission", "العمولة", {type:"number",min:0,max:1e12})}
          </div>
        </Section>
        <div
          className={`transfer-feedback ${saved ? "saved" : ""}`}
          role="status"
        >
          {message ||
            "الحقول المعلّمة بـ * مطلوبة. الحفظ دائم محليًا على هذا المتصفح."}
        </div>
        <div className="transfer-actions panel">
          <div className="transfer-primary-actions">
            <button
              className="transfer-button primary"
              type="submit"
              value="save"
            >
              حفظ <Icon name="shield" size={17} />
            </button>
            <button className="transfer-button" type="submit" value="print">
              حفظ وطباعة <Icon name="layers" size={17} />
            </button>
          </div>
          <div className="transfer-secondary-actions">
            <button
              className="transfer-button subtle"
              type="button"
              onClick={clear}
            >
              مسح الحقول
            </button>
            <button
              className="transfer-button subtle"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              إلغاء
            </button>
          </div>
        </div>
      </form>
      <dialog
        ref={dialog}
        className="transfer-print"
        aria-labelledby="receipt-title"
        onCancel={() => setPreview(false)}
        onClose={() => setPreview(false)}
      >
        <div className="receipt-heading">
          <Icon name="exchange" size={28} />
          <div>
            <h2 id="receipt-title">معاينة إيصال الحوالة</h2>
            <p>
              أعمال المستقبل · نسخة محلية محفوظة على هذا الجهاز
            </p>
          </div>
        </div>
        <dl>
          {[
            ["رقم الحوالة", transferId],
            ["التاريخ والوقت", dateLabel],
            ["المرسل", values.sender],
            ["هاتف المرسل", values.senderPhone],
            ["عنوان المرسل", values.senderAddress],
            ["المستفيد", values.recipient],
            ["هاتف المستفيد", values.recipientPhone],
            ["عنوان المستفيد", values.recipientAddress],
            ["المبلغ", `${number(amount)} ${values.currency}`],

            ["العمولة", `${number(commission)} ${values.currency}`],
            [
              "الإجمالي بعملة الحوالة",
              `${number(amount + commission)} ${values.currency}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="transfer-explanation">
          إيصال محاكاة فقط. لم يتم إرسال حوالة أو خصم رصيد.
        </p>
        <div className="receipt-actions">
          <button
            type="button"
            className="transfer-button primary"
            onClick={() => window.print()}
          >
            طباعة الإيصال
          </button>
          <button
            type="button"
            className="transfer-button"
            onClick={() => setPreview(false)}
          >
            إغلاق المعاينة
          </button>
        </div>
      </dialog>
    </div>
  );
}


