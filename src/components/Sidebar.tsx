import {useHiddenMenus} from '../data/menuVisibility';
import {currentVersion} from '../updates/versionService';
import {motion,useReducedMotion} from 'motion/react';
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { groups } from "../data/navigation";
import Icon from "./Icon";
export default function Sidebar({
  collapsed,
  onExpand,
  onNavigate,
  onClose,
}: {
  collapsed: boolean;
  onExpand: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const reduced=useReducedMotion();const hidden=useHiddenMenus();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<string[]>(["الحوالات"]);
  return (
    <aside
      id="main-sidebar"
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
    >
      {onClose && (
        <button
          className="drawer-close icon-button"
          aria-label="إغلاق القائمة"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
      <div className="brand">
        <span className="brand-mark">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="شعار أعمال المستقبل" width="43" height="43" style={{borderRadius: 12, objectFit: 'contain', flexShrink: 0}} />
        </span>
        <div>
          <strong>
            أعمال المستقبل
          </strong>
          <small>إدارة مالية. رؤية أوضح.</small>
        </div>
      </div>
      <div className="workspace">
        <span className="office-icon">
          <Icon name="building" />
        </span>
        <div>
          <b>المكتب الرئيسي</b>
          <small>الصندوق الرئيسي</small>
        </div>
        <span className="tiny-dot" />
      </div>
      <nav aria-label="القائمة الرئيسية">
        <span className="nav-caption">مساحة العمل</span>
        <NavLink
          className="nav-home"
          to="/dashboard"
          title="الرئيسية"
          onClick={onNavigate}
        >
          <Icon name="dashboard" />
          <span>الرئيسية</span>
        </NavLink>
        {groups.filter(g=>!hidden.includes(g.label)).map((g) => {
          const active = g.items.some(([, p]) => p === pathname);
          const expanded = open.includes(g.label) || active;
          return (
            <div className="nav-group" key={g.label}>
              <button
                className={`group-button ${active ? "group-active" : ""}`}
                title={g.label}
                aria-expanded={!collapsed && expanded}
                onClick={() => {
                  if (collapsed) onExpand();
                  setOpen((v) =>
                    v.includes(g.label)
                      ? v.filter((x) => x !== g.label)
                      : [...v, g.label],
                  );
                }}
              >
                <Icon name={g.icon} />
                <span>{g.label}</span>
                <span className={`group-chevron ${expanded ? "expanded" : ""}`}>
                  <Icon name="chevron" size={13} />
                </span>
              </button>
              {!collapsed && expanded && (
                <div className="subnav">
                  {g.items.map(([title, path]) => (
                    <NavLink to={path} key={path} onClick={onNavigate}>
                      {({isActive})=><>{isActive&&<motion.i className='premium-nav-indicator' layoutId='sidebar-active' transition={{duration:reduced?0:.18}}/>}{title}</>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <Icon name="shield" />
        <div>
          <b>مساحة التاجر</b>
          <small>حفظ محلي ومزامنة سحابية</small>
        </div>
        <span title={`الإصدار ${currentVersion}`}>v{currentVersion}</span>
      </div>
    </aside>
  );
}




