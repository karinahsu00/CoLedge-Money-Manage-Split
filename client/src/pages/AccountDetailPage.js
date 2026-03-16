import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const fmt = (n) => Number(n || 0).toFixed(2);

function AmountCell({ t, accountId, accountCurrency }) {
  let localAmount = t.accountId === accountId ? (t.fromAmount ?? t.amount) : (t.toAmount ?? t.amount);
  let localCurrency = t.accountId === accountId ? (t.fromCurrency || accountCurrency) : (t.toCurrency || accountCurrency);
  let usdAmount = t.usdAmount ?? (localAmount * (t.fxRateToUSD || 1));

  return (
    <div style={{ fontWeight: 600 }}>
      <span>{fmt(usdAmount)} USD</span>
      {localCurrency !== 'USD' && (
        <span style={{ color: '#888', marginLeft: '5px', fontSize: '0.85em', fontWeight: 400 }}>({fmt(localAmount)} {localCurrency})</span>
      )}
    </div>
  );
}

const AccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [acc, tx] = await Promise.all([accountsAPI.getById(id), transactionsAPI.getAll()]);
    setAccount(acc);
    setTransactions(tx.filter(t => t.accountId === id || t.accountToId === id));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const displayBalanceUSD = useMemo(() => (Number(account?.balance || 0) * Number(account?.fxRateToUSD || 1)), [account]);

  return (
    <div className="dashboard-container account-detail-page">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn" onClick={() => navigate('/login')}>Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <div className="dashboard-header"><h1>📒 {account?.name}</h1><button className="add-btn" onClick={() => navigate('/account')}>← Back</button></div>
        <div className="transaction-form-section">
          <div className="account-kpi">
            <div className="account-kpi-label">Current Balance</div>
            <div className="account-kpi-value">{fmt(displayBalanceUSD)} USD {account?.currency !== 'USD' && <span style={{ fontSize: '0.6em', color: '#888' }}>({fmt(account?.balance)} {account?.currency})</span>}</div>
          </div>
        </div>
        <div className="transaction-list">
          <h2>Transactions</h2>
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount (USD / Local)</th></tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}><td>{t.date}</td><td>{t.type}</td><td><AmountCell t={t} accountId={id} accountCurrency={account?.currency} /></td></tr>
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

export default AccountDetailPage;