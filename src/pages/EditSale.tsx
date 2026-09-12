import {useState} from 'react';
import {FinanceModal} from '../components/FinanceViews';
import {updateLocal} from '../data/localStore';
import type {InventorySale} from '../data/localStore';
import {editInventorySale} from '../data/inventorySale';
export default function EditSale({sale,close}:{sale:InventorySale;close:()=>void}){
 const [original]=useState(()=>JSON.stringify(sale));const [rows,setRows]=useState(()=>sale.lines.map(l=>({quantity:String(l.quantity),salePrice:String(l.salePrice)})));const [error,setError]=useState('');
 return <FinanceModal title="تعديل عملية البيع" close={close}><p>يتم تعديل المخزون والدين والربح معًا، وتبقى تكلفة الشراء الأصلية محفوظة.</p><form onSubmit={e=>{e.preventDefault();let applied=false;const ok=updateLocal(d=>{try{const next=editInventorySale(d,sale.id,original,rows.map(r=>({quantity:r.quantity.trim()?Number(r.quantity):NaN,salePrice:r.salePrice.trim()?Number(r.salePrice):NaN})));applied=true;return next;}catch(err){setError(err instanceof Error?err.message:'تعذر التعديل');return d;}});if(ok&&applied)close();}}>{sale.lines.map((l,i)=><section className="panel inventory-item" key={l.itemId}><h3>{l.name}</h3>{(['quantity','salePrice'] as const).map(k=><label className="tl-field" key={k}><span>{k==='quantity'?'الكمية':'سعر البيع'}</span><input required type="number" min={k==='quantity'?'0.000001':'0'} step="0.000001" value={rows[i][k]} onChange={e=>setRows(v=>v.map((r,n)=>n===i?{...r,[k]:e.target.value}:r))}/></label>)}</section>)}{error&&<p role="alert">{error}</p>}<button className="tl-button primary">حفظ التعديل</button><button type="button" className="tl-button" onClick={close}>إلغاء</button></form></FinanceModal>;
}
