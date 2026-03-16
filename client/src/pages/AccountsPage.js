import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ─── AccountBalance ───────────────────────────────────────────────────────────
// Displays: XX.XX USD + (YY.YY LocalCurrency) when currency ≠ USD
const AccountBalance = ({ a }) => {
  const bal     = safeNum(a.balance, 0);
  // fxRateToUSD: how many USD = 1 unit of local currency
  // e.g. if JPY: fxRateToUSD ≈ 0.0067  →  bal * rate gives correct USD
  const fxRate  = safeNum(a.fxRateToUSD, 1);
  const usdBal  = bal * fxRate;

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#2C4C3B' }}>
        {usdBal.toFixed(2)} USD
      </div>
      {a.currency !== 'USD' && (
        <div style={{ fontSize: '0.85em', color: '#888' }}>
          {bal.toFixed(2)} {a.currency}
        </div>
      )}
    </div>
  );
};

// ─── AccountsPage ─────────────────────────────────────────────────────────────
const AccountsPage = () => {
  const navigate      = useNavigate();
  const { logout }    = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const loadAccounts = async () => {
    const res = await accountsAPI.getAll();
    setAccounts(res?.data ?? res);
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  // Total net worth: sum of each account's balance converted to USD
  const totalUSD = useMemo(() =>
    (accounts || []).reduce(
      (sum, a) => sum + safeNum(a.balance) * safeNum(a.fxRateToUSD, 1),
      0,
    ),
  [accounts]);

  return (
    <div className="dashboard-container accounts-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn"        onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn"        onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn"        onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn"     onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>🏷️ Accounts</h1>
        </div>

        {/* ── Summary KPIs ── */}
        <div className="transaction-form-section">
          <div
            className="account-overview-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}
          >
            <div className="account-kpi" style={{ borderLeft: '5px solid #2C4C3B' }}>
              <div className="account-kpi-label">Total Net Worth (USD)</div>
              <div className="account-kpi-value">{totalUSD.toFixed(2)}</div>
            </div>
            <div className="account-kpi">
              <div className="account-kpi-label">Active Accounts</div>
              <div className="account-kpi-value">{accounts.length}</div>
            </div>
          </div>
        </div>

        {/* ── Account List ── */}
        <div className="transaction-list">
          <h2>Your Accounts</h2>

          {/* Desktop table */}
          <div className="accounts-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/account/${a.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{a.name}</td>
                    <td>{accountTypeLabel(a.type)}</td>
                    <td><AccountBalance a={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — full detail restored */}
          <div className="accounts-cards">
            {accounts.map(a => {
              const bal    = safeNum(a.balance, 0);
              const fxRate = safeNum(a.fxRateToUSD, 1);
              const usdBal = bal * fxRate;

              return (
                <div
                  key={a.id}
                  className="account-card-mobile"
                  onClick={() => navigate(`/account/${a.id}`)}
                  style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Row 1: account name + USD balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1em' }}>{a.name}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        {accountTypeLabel(a.type)}
                      </div>
                    </div>
                    <AccountBalance a={a} />
                  </div>

                  {/* Row 2: FX rate note when non-USD */}
                  {a.currency !== 'USD' && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#bbb' }}>
                      1 {a.currency} = {fxRate.toFixed(4)} USD
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default AccountsPage;