import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileTabBar.css';

// 定義分頁資料，方便維護
const TABS = [
  { label: 'Record',    icon: '📝', path: '/dashboard' },
  { label: 'Split',     icon: '🧾', path: '/split' },
  { label: 'Analytics', icon: '📊', path: '/analytics' },
  { label: 'Accounts',  icon: '🏦', path: '/account' },
  { label: 'More',      icon: '⚙️',  path: '/more' },
];

const MobileTabBar = () => {
  return (
    <nav className="mobile-tabbar" aria-label="Mobile bottom navigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          // NavLink 會自動判斷 isActive，我們只需定義 class 名稱
          className={({ isActive }) => 
            `mobile-tabbar__item ${isActive ? 'is-active' : ''}`
          }
        >
          <span className="mobile-tabbar__icon" aria-hidden="true">{tab.icon}</span>
          <span className="mobile-tabbar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileTabBar;