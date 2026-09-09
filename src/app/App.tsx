import SubscriptionStatus from '../cloud/SubscriptionStatus';
import CloudSync from '../cloud/CloudSync';
import AccessSettings from '../pages/AccessSettings';
import {useLocalData,localError} from '../data/localStore';
import UpdateNotification from '../updates/UpdateNotification';
import {PageTransition} from '../components/premium/MotionUI';
import PremiumRuntime from '../components/premium/PremiumRuntime';
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { EmptyDevelopmentState, PageHeader } from "../components/ui";
import Icon from "../components/Icon";
import Dashboard from "../pages/Dashboard";
import NewTransfer from "../pages/NewTransfer";
import TransferList from "../pages/TransferList";
import CancelledTransfers from '../pages/CancelledTransfers';
import PendingTransfers from "../pages/PendingTransfers";
import Customers from "../pages/Customers";
import NewCustomer from "../pages/NewCustomer";
import Cashbox from "../pages/Cashbox";
import CashVoucher from "../pages/CashVoucher";
import PeriodReport from '../pages/PeriodReport';
import ExchangeRates from '../pages/ExchangeRates';
import ExchangeTransferReport from '../pages/ExchangeTransferReport';
import ExchangeTrade from '../pages/ExchangeTrade';
import CashRegisterReport from "../pages/CashRegisterReport";
import { pages } from "../data/navigation";
function subscribeViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}
function viewportMode() {
  return window.innerWidth < 768
    ? "mobile"
    : window.innerWidth < 1200
      ? "tablet"
      : "desktop";
}
function readTheme() {
  try {
    return localStorage.getItem("exchange-theme") === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}
export default function App() {
  useLocalData();
  const [theme, setTheme] = useState(readTheme);
  const mode = useSyncExternalStore(subscribeViewport, viewportMode);
  const [collapsePreference, setCollapsed] = useState<boolean | null>(null);
  const collapsed =
    mode !== "mobile" && (collapsePreference ?? mode === "tablet");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const showDrawer = mode === "mobile" && drawerOpen;
  const { pathname, search } = useLocation();
  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const closeOnBreakpointChange = () => setDrawerOpen(false);
    mobileViewport.addEventListener("change", closeOnBreakpointChange);
    return () =>
      mobileViewport.removeEventListener("change", closeOnBreakpointChange);
  }, []);
  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (showDrawer) dialog.showModal();
    else if (dialog.open) dialog.close();
    const previousOverflow = document.body.style.overflow;
    if (showDrawer) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [showDrawer]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("exchange-theme", theme);
    } catch {
      /* Theme remains usable when storage is unavailable. */
    }
  }, [theme]);
  useEffect(() => {
    document.title = `${pathname === "/transfers/new" ? "إرسال حوالة جديدة" : pages.find((p) => p.path === pathname)?.title || "الرئيسية"} | أعمال المستقبل`;
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <PremiumRuntime /><a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      {mode === "mobile" ? (
        <dialog
          ref={drawer}
          className="mobile-drawer"
          aria-label="القائمة الرئيسية"
          onClose={() => setDrawerOpen(false)}
          onCancel={() => setDrawerOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDrawerOpen(false);
          }}
        >
          <Sidebar
            collapsed={false}
            onExpand={() => {}}
            onNavigate={() => setDrawerOpen(false)}
            onClose={() => setDrawerOpen(false)}
          />
        </dialog>
      ) : (
        <Sidebar collapsed={collapsed} onExpand={() => setCollapsed(false)} />
      )}
      <div className="main-shell">
        <TopBar
          theme={theme}
          toggleTheme={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
          collapsed={collapsed}
          mobile={mode === "mobile"}
          drawerOpen={showDrawer}
          toggleSidebar={() =>
            mode === "mobile" ? setDrawerOpen(true) : setCollapsed(!collapsed)
          }
        />
        <SubscriptionStatus/><CloudSync/><UpdateNotification />
        {localError()&&<p className="tl-error" role="alert">{localError()}</p>}
        <PageTransition key={pathname} id="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={<AccessSettings theme={theme} setTheme={setTheme}/>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports/daily" element={<PeriodReport key="daily" mode="daily" />} /><Route path="/reports/monthly" element={<PeriodReport key="monthly" mode="monthly" />} /><Route path="/reports/yearly" element={<PeriodReport key="yearly" mode="yearly" />} /><Route path="/exchange/rates" element={<ExchangeRates />} /><Route path="/exchange/history" element={<ExchangeTransferReport key="exchange" />} /><Route path="/exchange/buy" element={<ExchangeTrade key="buy" />} /><Route path="/exchange/sell" element={<ExchangeTrade key="sell" sell />} /><Route path="/cashbox" element={<Cashbox />} />

            <Route
              path="/cashbox/balances"
              element={<CashRegisterReport key="balances" />}
            />

            <Route
              path="/cashbox/balance"
              element={<Navigate to="/cashbox/balances" replace />}
            />

            <Route
              path="/cashbox/receipt"
              element={<CashVoucher key="receipt" />}
            />
            <Route
              path="/cashbox/payment"
              element={<CashVoucher key="payment" payment />}
            />
            <Route path="/transfers/new" element={<NewTransfer key={search} />} />
            <Route path="/transfers/cancelled" element={<CancelledTransfers />} />
            <Route path="/transfers/pending" element={<PendingTransfers />} />
            <Route
              path="/transfers/undelivered"
              element={<Navigate to="/transfers/pending" replace />}
            />
            <Route path="/customers" element={<Customers key="customers" />} />

            <Route path="/customers/new" element={<NewCustomer/>}/>
            <Route
              path="/customers/activity"
              element={<Navigate to="/customers" replace />}
            />




            <Route
              path="/customers/balances"
              element={<Customers key="balances" balances />}
            />
            <Route
              path="/transfers/outgoing"
              element={<TransferList key="outgoing" mode="outgoing" />}
            />
            <Route
              path="/transfers/incoming"
              element={<TransferList key="incoming" mode="incoming" />}
            />
            {pages
              .filter(
                (page) =>
                  ![
                    "/settings", "/cashbox/close-day", "/reports/daily", "/reports/monthly", "/reports/yearly", "/reports/customers", "/reports/partners", "/reports/cashbox", "/exchange/rates", "/exchange/history", "/reports/transfers", "/exchange/buy", "/exchange/sell", "/transfers/new",
                    "/transfers/pending", "/transfers/cancelled",
                    "/transfers/undelivered",
                    "/customers",
                    "/customers/statement",
                    "/customers/new",
                    "/customers/activity",
                    "/partners",
                    "/cashbox",
                    "/cashbox/transfer",
                    "/cashbox/balances",
                    "/cashbox/movements",
                    "/cashbox/balance",
                    "/cashbox/activity",
                    "/cashbox/receipt",
                    "/cashbox/payment",
                    "/partners/balances",
                    "/partners/statement",
                    "/partners/settlements",
                    "/customers/balances",
                    "/transfers/outgoing",
                    "/transfers/incoming",
                  ].includes(page.path),
              )
              .map((page) => (
                <Route
                  key={page.path}
                  path={page.path}
                  element={
                    <>
                      <nav className="breadcrumb" aria-label="مسار الصفحة">
                        <Link to="/dashboard">الرئيسية</Link>
                        <Icon name="chevron" size={12} />
                        <span>{page.group}</span>
                        <Icon name="chevron" size={12} />
                        <b>{page.title}</b>
                      </nav>
                      <PageHeader
                        title={page.title}
                        description={page.description}
                      >
                        <span className="page-icon">
                          <Icon name={page.icon} size={27} />
                        </span>
                      </PageHeader>
                      <EmptyDevelopmentState icon={page.icon} />
                    </>
                  }
                />
              ))}
            <Route
              path="*"
              element={
                <>
                  <PageHeader
                    title="الصفحة غير موجودة"
                    description="المسار المطلوب غير متاح في هذه النسخة."
                  />
                  <Link className="button" to="/dashboard">
                    العودة إلى الرئيسية
                  </Link>
                </>
              }
            />
          </Routes>
        </PageTransition>
      </div>
    </div>
  );
}









