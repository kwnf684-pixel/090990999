import {NavLink} from 'react-router-dom';
export default function InventoryTabs(){return <nav className="inventory-tabs" aria-label="تبويبات المخزون"><NavLink end to="/inventory">المواد</NavLink><NavLink to="/inventory/customers">الزبائن</NavLink></nav>;}
