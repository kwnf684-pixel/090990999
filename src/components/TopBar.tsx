import ContactAdmin from './ContactAdmin';
import {useSyncExternalStore} from 'react';
import {getSession,subscribeAccess,accessVersion} from '../data/localAccess';
import {PremiumButton,AnimatedInput} from './premium/MotionUI';
import Icon from "./Icon";
export default function TopBar({
  theme,
  toggleTheme,
  toggleSidebar,
  collapsed,
  mobile,
  drawerOpen,
}: {
  theme: string;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  collapsed: boolean;
  mobile: boolean;
  drawerOpen: boolean;
}) {
  useSyncExternalStore(subscribeAccess,accessVersion);
  const merchant=getSession();
  return (
    <header className="topbar">
      <div className="topbar-start">
        <PremiumButton
          className="icon-button"
          aria-label={
            mobile
              ? "فتح القائمة"
              : collapsed
                ? "تكبير القائمة الجانبية"
                : "تصغير القائمة الجانبية"
          }
          aria-expanded={mobile ? drawerOpen : !collapsed}
          aria-controls="main-sidebar"
          onClick={toggleSidebar}
        >
          <Icon name="menu" />
        </PremiumButton>
        <div className="search-field">
          <Icon name="search" size={18} />
          <AnimatedInput
            aria-label="البحث العام التجريبي"
            placeholder="ابحث في النظام..."
          />
          <span>تجريبي</span>
        </div>
      </div>
      <div className="topbar-end">
        <span className="local-tag">
          <i />
          محلي + سحابي
        </span>
        <PremiumButton
          className="icon-button"
          aria-label={
            theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"
          }
          onClick={toggleTheme}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </PremiumButton>
        <ContactAdmin/><div className="user-info">
          <span className="avatar"><img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="شعار أعمال المستقبل" style={{width:'100%',height:'100%',objectFit:'contain',borderRadius:'inherit'}} /></span>
          <div>
            <b>{merchant?.name||'التاجر'}</b>
            <small>حساب التاجر</small>
          </div>
        </div>
      </div>
    </header>
  );
}

