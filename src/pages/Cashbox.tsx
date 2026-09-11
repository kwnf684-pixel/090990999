import CashBalanceEditor from '../components/CashBalanceEditor';
import {useCashLedger} from '../data/cashLedger';
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, QuickActionCard } from "../components/ui";
import {
  FinanceModal,
  FinanceDetails,
  FinanceRows,
} from "../components/FinanceViews";
import {
  cashboxActions,
} from "../data/cashboxMock";
import "./financePages.css";
import "./cashbox.css";
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
export default function Cashbox() {
  const {cashboxBalances,cashboxMovements}=useCashLedger();
  const d=new Date();const cashboxDay=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [selected, setSelected] = useState("");
  const current = cashboxMovements.find((m) => m.id === selected);
  const today = cashboxMovements.filter((m) => m.date.startsWith(cashboxDay));
  function totals(type: string) {
    return (
      <div className="tl-currency-totals">
        {Object.keys(cashboxBalances).map((currency) => (
          <span key={currency}>
            <b>
              {fmt(
                today
                  .filter((m) => m.currency === currency && m.type === type)
                  .reduce((s, m) => s + m.amount, 0),
              )}
            </b>
            <small>{currency}</small>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="finance-page cashbox-page">
      <nav className="breadcrumb">
        <Link to="/dashboard">الرئيسية</Link>
        <span> / الصندوق</span>
      </nav>
      <PageHeader
        title="الصندوق"
        description="نظرة شاملة على السيولة وحركات الصندوق المحلية."
      />
      <p className="tl-disclaimer">
        اليوم: {cashboxDay}. سندات القبض والصرف المحفوظة تحدّث الصندوق الرئيسي محليًا على هذا المتصفح. تبقى البيانات محفوظة بعد إعادة فتح المتصفح.
      </p>
      <CashBalanceEditor/><div className="tl-stats cashbox-stats">
        {[
          [
            "رصيد الدولار",
            <b className="cashbox-stat" dir="ltr">
              {fmt(cashboxBalances.USD)} USD
            </b>,
          ],
          [
            "رصيد الدينار",
            <b className="cashbox-stat" dir="ltr">
              {fmt(cashboxBalances.IQD)} IQD
            </b>,
          ],
          [
            "رصيد العملات الأخرى",
            <b className="cashbox-stat" dir="ltr">
              {Object.entries(cashboxBalances).filter(([code])=>!["USD","IQD"].includes(code)).map(([code,value])=><span key={code} style={{display:"block"}}>{fmt(value)} {code}</span>)}
            </b>,
          ],
          ["قبض اليوم", totals("قبض")],
          ["صرف اليوم", totals("صرف")],
          ["عدد حركات اليوم", <b className="tl-stat-number">{today.length}</b>],
        ].map(([label, value], i) => (
          <article className="panel" key={i}>
            <small>{label}</small>
            {value}
          </article>
        ))}
      </div>
      <section>
        <div className="section-heading">
          <h2>إجراءات سريعة</h2>
          <span>عمليات الصندوق</span>
        </div>
        <div className="quick-grid cashbox-quick">
          {cashboxActions.map((action) => (
            <QuickActionCard key={action.path} {...action} />
          ))}
        </div>
      </section>
      <section className="panel finance-results">
        <div className="panel-heading">
          <h2>آخر حركات الصندوق</h2>
          <span className="eyebrow">
            {cashboxMovements.length} حركات محلية
          </span>
        </div>
        <FinanceRows
          headers={[
            "رقم الحركة",
            "التاريخ والوقت",
            "نوع الحركة",
            "المرجع",
            "البيان",
            "المبلغ",
            "العملة",
            "داخل / خارج",
            "الرصيد بعد الحركة",
            "المستخدم",
            "عرض",
          ]}
          rows={[...cashboxMovements].reverse().map((m) => ({
            id: m.id,
            cells: [
              m.id,
              m.date.replace("T", " · "),
              m.type,
              m.reference,
              m.description,
              fmt(m.amount),
              m.currency,
              <span className={`tl-badge ${m.incoming ? "done" : "pending"}`}>
                {m.incoming ? "داخل" : "خارج"}
              </span>,
              fmt(m.balance),
              m.user,
              <button className="tl-button" onClick={() => setSelected(m.id)}>
                عرض
              </button>,
            ],
          }))}
        />
      </section>
      {current && (
        <FinanceModal title="تفاصيل حركة الصندوق" close={() => setSelected("")}>
          <p className="tl-disclaimer">
            سجل محلي توضيحي، غير مرتبط بعملية مالية حقيقية.
          </p>
          <FinanceDetails
            items={[
              ["رقم الحركة", current.id],
              ["التاريخ والوقت", current.date.replace("T", " · ")],
              ["نوع الحركة", current.type],
              ["الطرف", current.party],
              ["نوع الطرف", current.partyType],
              ["سبب السند", current.reason||"—"],
              ["الملاحظات", current.notes||"—"],
              ["المرجع", current.reference],
              ["البيان", current.description],
              ["المبلغ", `${fmt(current.amount)} ${current.currency}`],
              ["الاتجاه", current.incoming ? "داخل" : "خارج"],
              [
                "الرصيد بعد الحركة",
                `${fmt(current.balance)} ${current.currency}`,
              ],
              ["المستخدم", current.user],
            ]}
          />
        </FinanceModal>
      )}
    </div>
  );
}
