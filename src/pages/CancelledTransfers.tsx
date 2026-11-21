import {recordNumber} from '../data/displayNumbers';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { FinanceRows } from '../components/FinanceViews';
import { useTransferRecords } from '../data/transferRecords';
import { RecordModal, TransferStatusSelect } from './TransferList';
import type { Action } from './TransferList';
import './financePages.css';
export default function CancelledTransfers() {
  const records = useTransferRecords();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{id:string;action:Action}|null>(null);
  const filtered = records.filter(r => r.status === 'ملغاة' && `${recordNumber(r.id)} ${r.sender} ${r.recipient} ${r.senderPhone} ${r.recipientPhone}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  const row = records.find(r => r.id === selected?.id);
  return <div className="transfer-list finance-page">
    <nav className="breadcrumb"><Link to="/dashboard">الرئيسية</Link><span> / الحوالات / الملغاة</span></nav>
    <PageHeader title="الحوالات الملغاة" description="متابعة الحوالات الملغاة وتعديل حالتها داخل البيانات المحلية." />
    <section className="panel tl-filters"><label className="tl-field"><span>بحث برقم الحوالة أو الاسم أو الهاتف</span><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} /></label></section>
    <section className="panel tl-results"><div className="panel-heading"><h2>سجل الحوالات الملغاة</h2><span>{filtered.length} حوالة</span></div>
      <FinanceRows headers={['رقم الحوالة','النوع','التاريخ','المرسل','المستفيد','المبلغ','العملة','العمولة','الحالة','الإجراءات']} rows={filtered.slice((current-1)*5,current*5).map(r=>({id:r.id,cells:[recordNumber(r.id),r.direction==='incoming'?'واردة':'صادرة',r.date.replace('T',' · '),r.sender,r.recipient,r.amount.toLocaleString('en-US'),r.currency,r.commission.toLocaleString('en-US'),<TransferStatusSelect row={r}/>,<div className="tl-row-actions"><button onClick={()=>setSelected({id:r.id,action:'details'})}>عرض التفاصيل</button><button onClick={()=>setSelected({id:r.id,action:'print'})}>طباعة</button></div>]}))}/>
      <nav className="tl-pagination" aria-label="صفحات الحوالات الملغاة"><button className="tl-button" disabled={current===1} onClick={()=>setPage(current-1)}>السابق</button><span>صفحة {current} من {pages}</span><button className="tl-button" disabled={current===pages} onClick={()=>setPage(current+1)}>التالي</button></nav>
    </section><p className="tl-disclaimer">تغيير الحالة محلي فقط. الحوالة التي تصبح غير ملغاة تختفي من هذا السجل وتظهر بحالتها الجديدة في الواردة أو الصادرة.</p>
    {selected&&row&&<RecordModal key={`${row.id}-${selected.action}`} row={row} action={selected.action} close={()=>setSelected(null)}/>}
  </div>;
}
