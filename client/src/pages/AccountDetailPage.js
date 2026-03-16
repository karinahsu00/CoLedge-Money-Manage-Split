import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const fmt = (n) => Number(n || 0).toFixed(2);
const ym = (dateStr) => (dateStr && typeof dateStr === 'string' ? dateStr.slice(0, 7) : 'Unknown');

const AccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [acc, txList] = await Promise.all([accountsAPI.getById(id), transactionsAPI.getAll()]);
    setAccount(acc);
    setTransactions(txList.filter(t => t.accountId === id || t.accountToId === id));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const currency = account?.currency || 'USD';
  const rate = Number(account?.fxRateToUSD || 1);

  // 1. 自動校準後的餘額與摘要 (使用歷史交易算出)
  const { summary, runningBalance } = useMemo(() => {
    let income = 0, expense = 0, tIn = 0, tOut = 0;
    let running = Number(account?.initialBalance || 0);

    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sorted.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income' && t.accountId === id) { income += amt; running += amt; }
      else if (t.type === 'expense' && t.accountId === id) { expense += amt; running -= amt; }
      else if (t.type === 'transfer') {
        if (t.accountId === id) { tOut += Number(t.fromAmount || amt); running -= Number(t.fromAmount || amt); }
        if (t.accountToId === id) { tIn += Number(t.toAmount || amt); running += Number(t.toAmount || amt); }
      }
    });
    return { summary: { income, expense, tIn, tOut }, runningBalance: running };
  }, [transactions, id, account?.initialBalance]);

  // 2. USD 等值計算
  const balanceUSD = (runningBalance * rate).toFixed(2);

  return (
    <div className="dashboard-container account-detail-page">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn" onClick={() => navigate('/login')}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header"><h1>📒 {account?.name}</h1><button className="add-btn" onClick={() => navigate('/account')}>← Back</button></div>
        
        <div className="transaction-form-section">
            <h2>Account Overview (USD Focus)</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi" style={{borderLeft: '4px solid #2C4C3B'}}>
                    <div className="account-kpi-label">Current (USD)</div>
                    <div className="account-kpi-value">{balanceUSD}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">In {currency}</div>
                    <div className="account-kpi-value" style={{fontSize: '1rem'}}>{fmt(runningBalance)}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Type</div>
                    <div className="account-kpi-value" style={{fontSize: '1.1rem'}}>{accountTypeLabel(account?.type)}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Initial Balance</div>
                    <div className="account-kpi-value">{fmt(account?.initialBalance)}</div>
                </div>
            </div>

            <h2 style={{marginTop: '30px'}}>All-time Summary ({currency})</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi kpi-income">
                    <div className="account-kpi-label">Total Income</div>
                    <div className="account-kpi-value">+{fmt(summary.income)}</div>
                </div>
                <div className="account-kpi kpi-expense">
                    <div className="account-kpi-label">Total Expense</div>
                    <div className="account-kpi-value">-{fmt(summary.expense)}</div>
                </div>
                <div className="account-kpi kpi-income">
                    <div className="account-kpi-label">Transfers In</div>
                    <div className="account-kpi-value">+{fmt(summary.tIn)}</div>
                </div>
                <div className="account-kpi kpi-expense">
                    <div className="account-kpi-label">Transfers Out</div>
                    <div className="account-kpi-value">-{fmt(summary.tOut)}</div>
                </div>
            </div>
        </div>

        <div className="transaction-list">
          <h2>Transactions</h2>
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount (USD / {currency})</th></tr></thead>
              <tbody>
                {[...transactions].reverse().map(t => {
                    const localAmt = t.accountId === id ? (t.fromAmount || t.amount) : (t.toAmount || t.amount);
                    const tUsd = (Number(localAmt) * rate).toFixed(2);
                    return (
                        <tr key={t.id}>
                            <td>{t.date}</td><td>{t.type}</td>
                            <td><div style={{fontWeight: 600}}>{tUsd} USD <span style={{fontSize: '0.8em', color: '#888'}}>({fmt(localAmt)} {currency})</span></div></td>
                        </tr>
                    );
                })}
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