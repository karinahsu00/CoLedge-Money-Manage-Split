import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const MorePage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="dashboard-container more-page">
      {/* 桌面版顯示 Navbar，手機版會透過 CSS 隱藏 */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
          <button className="nav-btn active">More</button>
          {currentUser && <span className="user-email">{currentUser.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>⚙️ More</h1>
        </div>

        {/* 帳號資訊區塊 */}
        <div className="transaction-form-section">
          <h2>Account</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted, #656D4A)', fontWeight: 700 }}>
                Signed in as
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text, #283618)' }}>
                {currentUser?.email || '—'}
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout} style={{ width: '100%' }}>
              Logout
            </button>
          </div>
        </div>

        {/* 幫助說明區塊 */}
        <div className="transaction-list">
          <h2>Help</h2>
          <p style={{ color: 'var(--color-text-muted, #656D4A)', fontSize: '14px' }}>
            Use the bottom tabs to navigate. You can logout from this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MorePage;