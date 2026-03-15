import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import MobileTabBar from '../components/MobileTabBar';
import './Dashboard.css';

const MorePage = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    {currentUser && <span className="user-email">{currentUser.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>More</h1>
                </div>

                <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 'var(--radius-md, 10px)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border-light, #E3D5CA)', overflow: 'hidden', marginBottom: '20px' }}>
                    {currentUser && (
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light, #E3D5CA)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #656D4A)', marginBottom: '4px' }}>Signed in as</div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text, #283618)', wordBreak: 'break-all' }}>{currentUser.email}</div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '16px 20px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--color-danger, #BF4342)',
                            fontSize: '15px',
                            fontWeight: 600,
                        }}
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            <MobileTabBar />
        </div>
    );
};

export default MorePage;
=======
import './Dashboard.css';

const MorePage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container more-page">
      {/* Keep navbar for desktop; mobile will hide it via CSS */}
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

        <div className="transaction-list">
          <h2>Help</h2>
          <p style={{ color: 'var(--color-text-muted, #656D4A)' }}>
            Use the bottom tabs to navigate. You can logout from this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MorePage;
>>>>>>> 49b59f9 (Fix mobile UI and accounts rendering)
