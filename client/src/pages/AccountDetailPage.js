import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  const rate = Number(account?.fxRateToUSD || 1);
  const currency = account?.currency || 'USD';

  const { summary, runningBalance } = useMemo(() => {
    let inc = 0, exp = 0, tIn = 0, tOut = 0;
    let running = Number(account?.initialBalance || 0);
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income' && t.accountId === id) { inc += amt; running += amt; }
      else if (t.type === 'expense' && t.accountId === id) { exp += amt; running -= amt; }
      else if (t.type === 'transfer') { 
        if (t.accountId === id) { tOut += (t.fromAmount || amt); running -= (t.fromAmount || amt); } 
        else { tIn += (t.toAmount || amt); running += (t.toAmount || amt); } 
      }
    });
    return { summary: { inc, exp, tIn, tOut }, runningBalance: running };
  }, [transactions, id, account]);

  if (loading) return <h2>Loading...</h2>;

  return (
    <div className="dashboard-container account-detail-page">
      <nav className="navbar"><div className="navbar-brand">🏦 CoLedge</div></nav>
      <div className="dashboard-content">
        <div className="dashboard-header"><h1>📒 {account?.name}</h1><button className="add-btn" onClick={() => navigate('/account')}>Back</button></div>
        
        {/* 恢復 8 張 KPI 卡片 */}
        <div className="transaction-form-section">
            <h2>Overview</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi" style={{borderLeft: '4px solid #2C4C3B'}}><div className="account-kpi-label">Current (USD)</div><div className="account-kpi-value">{(runningBalance * rate).toFixed(2)}</div></div>
                <div className="account-kpi"><div className="account-kpi-label">Balance ({currency})</div><div className="account-kpi-value">{fmt(runningBalance)}</div></div>
                <div className="account-kpi"><div className="account-kpi-label">Type</div><div className="account-kpi-value">{accountTypeLabel(account?.type)}</div></div>
                <div className="account-kpi"><div className="account-kpi-label">Initial</div><div className="account-kpi-value">{fmt(account?.initialBalance)}</div></div>
            </div>
            <h2 style={{marginTop: '20px'}}>All-time Stats</h2>
            <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="account-kpi kpi-income"><div className="account-kpi-label">Income</div><div className="account-kpi-value">+{fmt(summary.inc)}</div></div>
                <div className="account-kpi kpi-expense"><div className="account-kpi-label">Expense</div><div className="account-kpi-value">-{fmt(summary.exp)}</div></div>
                <div className="account-kpi kpi-income"><div className="account-kpi-label">T-In</div><div className="account-kpi-value">+{fmt(summary.tIn)}</div></div>
                <div className="account-kpi kpi-expense"><div className="account-kpi-label">T-Out</div><div className="account-kpi-value">-{fmt(summary.tOut)}</div></div>
            </div>
        </div>

        <div className="transaction-list">
          <h2>Transactions</h2>
          <div className="tx-table-wrap"><table className="tx-table"><thead><tr><th>Date</th><th>Type</th><th style={{textAlign: 'right'}}>Amount</th></tr></thead><tbody>{transactions.map(t => (<tr key={t.id}><td>{t.date}</td><td>{t.type}</td><td style={{textAlign: 'right'}}>{(Number(t.amount) * rate).toFixed(2)} USD ({t.amount} {currency})</td></tr>))}</tbody></table></div>
          <div className="accounts-cards">{transactions.map(t => (<div key={t.id} className="account-card-mobile" style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.date} • {t.type}</span><span style={{ fontWeight: 600 }}>{(Number(t.amount) * rate).toFixed(2)} USD</span></div></div>))}</div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountDetailPage;