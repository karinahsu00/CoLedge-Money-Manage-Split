import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const AccountBalance = ({ a }) => {
  const bal = Number(a.balance || 0);
  const rate = Number(a.fxRateToUSD || 1);
  const usdVal = (bal * rate).toFixed(2);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#2C4C3B' }}>{usdVal} USD</div>
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
    setAccounts(Array.isArray(res) ? res : (res?.data || []));
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const totalUSD = useMemo(() => accounts.reduce((sum, a) => sum + (Number(a.balance) * Number(a.fxRateToUSD || 1)), 0), [accounts]);

  if (loading) return <h2>Loading...</h2>;

  return (
    <div className="dashboard-container accounts-page">
      <nav className="navbar"><div className="navbar-brand">🏦 CoLedge</div><div className="nav-links"><button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button><button className="nav-btn active">Accounts</button><button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button></div></nav>
      <div className="dashboard-content">
        <div className="dashboard-header"><h1>🏷️ Accounts</h1></div>
        
        {/* KPI 卡片 */}
        <div className="transaction-form-section">
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="account-kpi" style={{ borderLeft: '5px solid #2C4C3B' }}><div className="account-kpi-label">Total Assets (USD)</div><div className="account-kpi-value">{totalUSD.toFixed(2)}</div></div>
                <div className="account-kpi"><div className="account-kpi-label">Accounts</div><div className="account-kpi-value">{accounts.length}</div></div>
            </div>
        </div>

        <div className="transaction-list">
          <h2>Your Accounts</h2>
          <div className="accounts-table-wrap"><table className="tx-table"><thead><tr><th>Name</th><th>Type</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead><tbody>{accounts.map(a => (<tr key={a.id} onClick={() => navigate(`/account/${a.id}`)} style={{ cursor: 'pointer' }}><td>{a.name}</td><td>{accountTypeLabel(a.type)}</td><td><AccountBalance a={a} /></td></tr>))}</tbody></table></div>
          
          {/* 📱 手機版卡片 */}
          <div className="accounts-cards">{accounts.map(a => (<div key={a.id} className="account-card-mobile" onClick={() => navigate(`/account/${a.id}`)} style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>{a.name}</span><AccountBalance a={a} /></div></div>))}</div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountsPage;