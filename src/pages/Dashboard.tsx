import {useHiddenMenus} from '../data/menuVisibility';
import {useLocalData,updateLocal} from '../data/localStore';
import { useState } from 'react';
import { useCashLedger } from '../data/cashLedger';
import { motion, useReducedMotion } from 'motion/react';
import { stats } from '../data/mockData';
import { PageHeader, QuickActionCard, StatCard, StatusBadge } from '../components/ui';
import { AnimatedCard, AnimatedModal, AnimatedNumber, PremiumButton } from '../components/premium/MotionUI';
import Icon from '../components/Icon';
import '../pages/transferList.css';
import './dashboard.css';

type Wallet = { id: string; name: string; balance: number };
const actions = [
  { title: 'قبض', path: '/cashbox/receipt', icon: 'down' },
  { title: 'صرف', path: '/cashbox/payment', icon: 'up' },
  { title: 'إضافة عميل', path: '/customers/new', icon: 'user' },
  { title: 'سعر شراء', path: '/exchange/buy', icon: 'exchange' },
  { title: 'سعر بيع', path: '/exchange/sell', icon: 'exchange' },
];
export default function Dashboard() {const hidden=useHiddenMenus();
  const { cashboxBalances,cashboxMovements } = useCashLedger();
  const operations=cashboxMovements.slice().reverse().slice(0,20).map(m=>({id:m.id,type:m.type,customer:m.party,amount:m.amount.toLocaleString('en-US'),currency:m.currency,status:'مكتملة',time:m.date.replace('T',' ')}));
  const wallets=useLocalData().wallets||[];
  const [editor, setEditor] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showOperations, setShowOperations] = useState(false);
  const reduced = useReducedMotion();
  function saveWallets(next:Wallet[]){if(!updateLocal(data=>({...data,wallets:next})))return false;setNotice('تم حفظ المحافظ محليًا');return true;}
  function edit(wallet?: Wallet) {
    setEditor(wallet || { id: '', name: '', balance: 0 });
    setName(wallet?.name || ''); setBalance(wallet ? String(wallet.balance) : ''); setError('');
  }
  return <div className="dashboard-simple">
    <PageHeader title="أرصدتك، بنظرة واحدة" description="مساحة مختصرة لإدارة يومك.">
      <PremiumButton onClick={() => setShowOperations(true)} aria-haspopup="dialog" aria-expanded={showOperations} aria-label={`آخر العمليات، ${operations.length} عمليات أخيرة`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        آخر العمليات <span className="count-badge">{operations.length}</span>
      </PremiumButton>
    </PageHeader>
    <section className="stats-grid" aria-label="ملخص الأرصدة">
      {stats.filter(s => ['رصيد الدولار', 'رصيد الدينار'].includes(s.title)).map(s => <StatCard key={s.title} stat={{ ...s, value: cashboxBalances[s.title === 'رصيد الدولار' ? 'USD' : 'IQD'].toLocaleString('en-US', { maximumFractionDigits: 6 }), note: 'رصيد الصندوق الرئيسي · محفوظ محليًا' }} />)}
      <StatCard stat={{ title: 'أرصدة المحافظ', value: wallets.reduce((sum, w) => sum + w.balance, 0).toLocaleString('en-US', { maximumFractionDigits: 2 }), unit: 'IQD', icon: 'wallet', note: `${wallets.length} محافظ · بيانات محلية`, tone: 'purple' }} />
    </section>
    <section className="quick-section">
      <div className="section-heading"><h2>إجراءات سريعة</h2></div>
      <div className="quick-grid">{actions.filter(a=>!hidden.includes(a.path.startsWith('/cashbox')?'الصندوق':a.path.startsWith('/customers')?'العملاء':'الصيرفة')).map(a => <QuickActionCard key={a.title} {...a} />)}</div>
    </section>
    <section className="panel dashboard-wallets">
      <div className="panel-heading"><div><h2>المحافظ الإلكترونية</h2><p>أرصدة بالدينار العراقي · محفوظة على هذا المتصفح</p></div><PremiumButton variant="primary" onClick={() => edit()}>+ إضافة محفظة</PremiumButton></div>
      {notice && <p className="dashboard-notice" role="status">{notice}</p>}
      <div className="dashboard-wallet-grid">
        {wallets.map(w => <AnimatedCard key={w.id} className="dashboard-wallet">
          <div className="dashboard-wallet-heading"><span className="icon-tile teal"><Icon name="wallet" /></span><h3 dir="auto">{w.name}</h3><span className="sample-label">محلي</span></div>
          <p>الرصيد المتاح</p><div className="dashboard-wallet-amount"><b dir="ltr"><AnimatedNumber value={w.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} /></b><span>IQD</span></div>
          <div className="dashboard-wallet-actions"><PremiumButton onClick={() => edit(w)} aria-label={`تعديل ${w.name}`}>تعديل</PremiumButton><PremiumButton variant="ghost" onClick={() => setDeleting(w)} aria-label={`حذف ${w.name}`}>حذف</PremiumButton></div>
        </AnimatedCard>)}
      </div>
      {!wallets.length && <p className="dashboard-empty">لا توجد محافظ حاليًا. أضف محفظتك الأولى للبدء.</p>}
    </section>
    <footer className="content-footer"><span>أعمال المستقبل</span><span>أرصدة من السجلات المحلية · محفوظة على هذا المتصفح</span></footer>
    {editor && <AnimatedModal title={editor.id ? 'تعديل محفظة' : 'إضافة محفظة'} close={() => setEditor(null)}>
      <form className="dashboard-wallet-form" onSubmit={event => {
        event.preventDefault(); const amount = Number(balance);
        if (!name.trim() || !balance.trim() || !Number.isFinite(amount) || amount < 0 || amount > 1e12) { setError('أدخل اسم المحفظة ورصيدًا صالحًا من صفر إلى تريليون دينار.'); return; }
        if (wallets.some(w => w.id !== editor.id && w.name.trim().toLowerCase() === name.trim().toLowerCase())) { setError('توجد محفظة بهذا الاسم بالفعل.'); return; }
        const next = { id: editor.id || crypto.randomUUID(), name: name.trim(), balance: amount };
        if(!saveWallets(editor.id ? wallets.map(w => w.id === editor.id ? next : w) : [...wallets, next]))return; setEditor(null);
      }}>
        <label>اسم المحفظة<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>الرصيد بالدينار العراقي<input required type="number" inputMode="decimal" min="0" max="1000000000000" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} /></label>
        {error && <p role="alert">{error}</p>}
        <div className="dashboard-wallet-actions"><PremiumButton type="submit" variant="primary">حفظ محلي</PremiumButton><PremiumButton type="button" onClick={() => setEditor(null)}>إلغاء</PremiumButton></div>
      </form>
    </AnimatedModal>}
    {deleting && <AnimatedModal title="حذف محفظة" close={() => setDeleting(null)}><p>حذف محفظة «{deleting.name}» ورصيدها التجريبي من هذا المتصفح؟</p><div className="dashboard-wallet-actions"><PremiumButton variant="danger" onClick={() => { if(saveWallets(wallets.filter(w => w.id !== deleting.id)))setDeleting(null); }}>تأكيد الحذف</PremiumButton><PremiumButton onClick={() => setDeleting(null)}>إلغاء</PremiumButton></div></AnimatedModal>}
    {showOperations && <AnimatedModal title="آخر العمليات" close={() => setShowOperations(false)}>
      <motion.div className="dashboard-operation-list" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
        <p>آخر {operations.length} عمليات مسجلة</p>
        {operations.map(op => <article className="dashboard-operation" key={op.id}><div><b>{op.type}</b><StatusBadge status={op.status} /></div><p>{op.customer}</p><div><strong dir="ltr">{op.amount} {op.currency}</strong><time>{op.time}</time></div><small dir="ltr">{op.id}</small></article>)}
      </motion.div>
    </AnimatedModal>}
  </div>;
}
