import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI } from '../config/api';
import { ACCOUNT_TYPES, accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const AccountBalance = ({ a }) => {
  const bal = Number(a.balance || 0);
  const rate = Number(a.fxRateToUSD || 1);
  const usdEquiv = (a.currency === 'USD' ? bal : bal * rate).toFixed(2);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#2C4C3B' }}>{usdEquiv} USD</div>
      {a.currency !== 'USD' && <div style={{ fontSize: '0.85em', color: '#888' }}>{bal.toFixed(2)} {a.currency}</div>}
    </div>
  );
};

const AccountsPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    const res = await accountsAPI.getAll();
    setAccounts(res?.data ?? res);
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const totalUSD = useMemo(() => (accounts || []).reduce((sum, a) => sum + (Number(a.balance) * Number(a.fxRateToUSD || 1)), 0), [accounts]);

  return (
    <div className="dashboard-container accounts-page">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header"><h1>🏷️ Accounts</h1></div>

        <div className="transaction-form-section">
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="account-kpi" style={{ borderLeft: '5px solid #2C4C3B' }}>
                    <div className="account-kpi-label">Total Net Worth (USD)</div>
                    <div className="account-kpi-value" style={{ fontSize: '1.8rem', color: '#2C4C3B' }}>{totalUSD.toFixed(2)} USD</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Active Accounts</div>
                    <div className="account-kpi-value">{accounts.filter(a=>!a.archived).length}</div>
                </div>
            </div>
        </div>

        <div className="transaction-list">
          <div className="tx-header"><h2>Your Accounts</h2></div>
          <div className="accounts-table-wrap">
            <table className="tx-table">
              <thead><tr><th>Name</th><th>Type</th><th>Currency</th><th style={{ textAlign: 'right' }}>Balance</th><th>Actions</th></tr></thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} onClick={() => navigate(`/account/${a.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{a.name}</td><td>{accountTypeLabel(a.type)}</td><td>{a.currency}</td><td><AccountBalance a={a} /></td>
                    <td onClick={e => e.stopPropagation()}><button className="edit-btn">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountsPage;