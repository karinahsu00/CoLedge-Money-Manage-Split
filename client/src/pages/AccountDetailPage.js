import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const fmt = (n) => Number(n || 0).toFixed(2);

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
  const rateToUSD = Number(account?.fxRateToUSD || 1);

  // 同步計算邏輯：解決數據矛盾
  const { summary, runningBalance } = useMemo(() => {
    let inc = 0, exp = 0, tIn = 0, tOut = 0;
    let running = Number(account?.initialBalance || 0);

    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income' && t.accountId === id) { inc += amt; running += amt; }
      else if (t.type === 'expense' && t.accountId === id) { exp += amt; running -= amt; }
      else if (t.type === 'transfer') {
        if (t.accountId === id) { tOut += Number(t.fromAmount || amt); running -= Number(t.fromAmount || amt); }
        if (t.accountToId === id) { tIn += Number(t.toAmount || amt); running += Number(t.toAmount || amt); }
      }
    });
    return { summary: { inc, exp, tIn, tOut }, runningBalance: running };
  }, [transactions, id, account?.initialBalance]);

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
        
        {/* 第一組 KPI：Overview (4 張) */}
        <div className="transaction-form-section">
            <h2>Account Overview (USD Focus)</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi" style={{borderLeft: '4px solid #2C4C3B'}}>
                    <div className="account-kpi-label">Current Balance (USD)</div>
                    <div className="account-kpi-value">{(runningBalance * rateToUSD).toFixed(2)}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Balance ({currency})</div>
                    <div className="account-kpi-value" style={{fontSize: '1rem'}}>{fmt(runningBalance)}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Account Type</div>
                    <div className="account-kpi-value" style={{fontSize: '1.1rem'}}>{accountTypeLabel(account?.type)}</div>
                </div>
                <div className="account-kpi">
                    <div className="account-kpi-label">Initial</div>
                    <div className="account-kpi-value">{fmt(account?.initialBalance)}</div>
                </div>
            </div>

            {/* 第二組 KPI：Summary (另外 4 張) */}
            <h2 style={{marginTop: '30px'}}>All-time Statistics ({currency})</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi kpi-income">
                    <div className="account-kpi-label">Income</div>
                    <div className="account-kpi-value">+{fmt(summary.inc)}</div>
                </div>
                <div className="account-kpi kpi-expense">
                    <div className="account-kpi-label">Expense</div>
                    <div className="account-kpi-value">-{fmt(summary.exp)}</div>
                </div>
                <div className="account-kpi kpi-income">
                    <div className="account-kpi-label">Total T-In</div>
                    <div className="account-kpi-value">+{fmt(summary.tIn)}</div>
                </div>
                <div className="account-kpi kpi-expense">
                    <div className="account-kpi-label">Total T-Out</div>
                    <div className="account-kpi-value">-{fmt(summary.tOut)}</div>
                </div>
            </div>
        </div>

        {/* 餘下的交易明細列表... */}
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountDetailPage;