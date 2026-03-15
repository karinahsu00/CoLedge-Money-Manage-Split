import React from 'react';
<<<<<<< HEAD
import { useNavigate, useLocation } from 'react-router-dom';
import './MobileTabBar.css';

const TABS = [
    { label: 'Record',    icon: '📝', path: '/dashboard' },
    { label: 'Split',     icon: '👥', path: '/split' },
    { label: 'Analytics', icon: '📈', path: '/analytics' },
    { label: 'Accounts',  icon: '💰', path: '/account' },
    { label: 'More',      icon: '☰',  path: '/more' },
];

const MobileTabBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="mobile-tab-bar" aria-label="Main navigation">
            {TABS.map(tab => {
                const isActive = location.pathname === tab.path ||
                    (tab.path === '/account' && location.pathname.startsWith('/account/'));
                return (
                    <button
                        key={tab.path}
                        className={`mobile-tab-bar__item${isActive ? ' active' : ''}`}
                        onClick={() => navigate(tab.path)}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={tab.label}
                    >
                        <span className="mobile-tab-bar__icon" aria-hidden="true">{tab.icon}</span>
                        <span className="mobile-tab-bar__label">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default MobileTabBar;
=======
import { NavLink } from 'react-router-dom';
import './MobileTabBar.css';

const MobileTabBar = () => {
  return (
    <nav className="mobile-tabbar" aria-label="Mobile bottom navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `mobile-tabbar__item ${isActive ? 'is-active' : ''}`}
      >
        <span className="mobile-tabbar__icon" aria-hidden="true">📝</span>
        <span className="mobile-tabbar__label">Record</span>
      </NavLink>

      <NavLink
        to="/split"
        className={({ isActive }) => `mobile-tabbar__item ${isActive ? 'is-active' : ''}`}
      >
        <span className="mobile-tabbar__icon" aria-hidden="true">🧾</span>
        <span className="mobile-tabbar__label">Split</span>
      </NavLink>

      <NavLink
        to="/analytics"
        className={({ isActive }) => `mobile-tabbar__item ${isActive ? 'is-active' : ''}`}
      >
        <span className="mobile-tabbar__icon" aria-hidden="true">📊</span>
        <span className="mobile-tabbar__label">Analytics</span>
      </NavLink>

      <NavLink
        to="/account"
        className={({ isActive }) => `mobile-tabbar__item ${isActive ? 'is-active' : ''}`}
      >
        <span className="mobile-tabbar__icon" aria-hidden="true">🏦</span>
        <span className="mobile-tabbar__label">Accounts</span>
      </NavLink>

      <NavLink
        to="/more"
        className={({ isActive }) => `mobile-tabbar__item ${isActive ? 'is-active' : ''}`}
      >
        <span className="mobile-tabbar__icon" aria-hidden="true">⚙️</span>
        <span className="mobile-tabbar__label">More</span>
      </NavLink>
    </nav>
  );
};

export default MobileTabBar;
>>>>>>> 49b59f9 (Fix mobile UI and accounts rendering)
