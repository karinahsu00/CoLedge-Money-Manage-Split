import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const ym = (dateStr) => (dateStr && typeof dateStr === 'string' ? dateStr.slice(0, 7) : 'Unknown');
const toTime = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const fmt = (n) => Number(n || 0).toFixed(2);

/**
 * 金額顯示組件：強制執行 LOCAL / USD 格式
 */
function AmountCell({ t, accountId, accountCurrency, isMobile = false }) {
  let localAmount = 0;
  let localCurrency = accountCurrency || 'USD';
  let usdAmount = null;

  if (t.type === 'transfer') {
    if (t.accountId === accountId) {
      localAmount = Number(t.fromAmount ?? t.amount ?? 0);
      localCurrency = t.fromCurrency || accountCurrency || 'USD';
    } else {
      localAmount = Number(t.toAmount ?? t.amount ?? 0);
      localCurrency = t.toCurrency || accountCurrency || 'USD';
    }
  } else {
    localAmount = Number(t.amount ?? 0);
    localCurrency = t.currency || accountCurrency || 'USD';
  }

  if (t.usdAmount != null) usdAmount = Number(t.usdAmount);
  else if (t.fxRateToUSD != null && localCurrency !== 'USD') usdAmount = localAmount * Number(t.fxRateToUSD);
  else if (localCurrency === 'USD') usdAmount = localAmount;

  return (
    <div style={{ fontWeight: 600, textAlign: isMobile ? 'left' : 'inherit' }}>
      <span>{fmt(localAmount)} {localCurrency}</span>
      {usdAmount != null && localCurrency !== 'USD' && (
        <span style={{ color: '#888', marginLeft: '5px', fontSize: '0.85em', fontWeight: 400 }}>
          / {fmt(usdAmount)} USD
        </span>
      )}
    </div>
  );
}

const AccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [account, setAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [acc, accList, tx] = await Promise.all([
        accountsAPI.getById(id),
        accountsAPI.getAll(),
        transactionsAPI.getAll(),
      ]);
      setAccount(acc);
      setAccounts(Array.isArray(accList) ? accList : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch (e) {
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const accountNameById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a?.id) m.set(a.id, a.name); });
    return m;
  }, [accounts]);

  const relatedTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    return list.filter((t) => t && (t.accountId === id || t.accountToId === id))
      .sort((a, b) => toTime(a.date) - toTime(b.date));
  }, [transactions, id]);

  const currency = account?.currency || 'USD';

  const monthly = useMemo(() => {
    const initial = Number(account?.initialBalance ?? 0);
    let running = initial;
    const map = new Map();
    relatedTransactions.forEach((t) => {
      const key = ym(t.date);
      if (!map.has(key)) map.set(key, { ym: key, income: 0, expense: 0, transferIn: 0, transferOut: 0, monthEndBalance: initial });
      const row = map.get(key);
      const amount = Number(t.amount || 0);
      if (t.type === 'income' && t.accountId === id) { row.income += amount; running += amount; }
      else if (t.type === 'expense' && t.accountId === id) { row.expense += amount; running -= amount; }
      else if (t.type === 'transfer') {
        if (t.accountId === id) { row.transferOut += Number(t.fromAmount ?? amount); running -= Number(t.fromAmount ?? amount); }
        if (t.accountToId === id) { row.transferIn += Number(t.toAmount ?? amount); running += Number(t.toAmount ?? amount); }
      }
      row.monthEndBalance = running;
    });
    return Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? 1 : -1));
  }, [relatedTransactions, id, account?.initialBalance]);

  const relatedTransactionsDesc = useMemo(() => {
    return [...relatedTransactions].sort((a, b) => toTime(b.date) - toTime(a.date));
  }, [relatedTransactions]);

  const title = account ? `${account.name}` : 'Account';
  const balance = Number(account?.balance || 0);

  return (
    <div className="dashboard-container account-detail-page">
      {/* Navbar (Hidden on Mobile) */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active" onClick={() => navigate('/account')}>Accounts</button>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>📒 {title}</h1>
          <button className="add-btn" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => navigate('/account')}>← Back</button>
        </div>

        {loading ? <h2>Loading...</h2> : (
          <React.Fragment>
            {/* KPI Overview */}
            <div className="transaction-form-section">
              <div className="account-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="account-kpi" style={{ borderLeft: '4px solid #2C4C3B' }}>
                  <div className="account-kpi-label">Current Balance</div>
                  <div className="account-kpi-value" style={{ color: balance < 0 ? '#ff6b6b' : '#2C4C3B' }}>
                    {fmt(balance)} {currency}
                  </div>
                </div>
                <div className="account-kpi">
                  <div className="account-kpi-label">Type</div>
                  <div className="account-kpi-value" style={{ fontSize: '1.1rem' }}>{accountTypeLabel(account.type)}</div>
                </div>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="transaction-list">
              <h2>Monthly Summary</h2>
              {/* Desktop Table */}
              <div className="tx-table-wrap accounts-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr><th>Month</th><th>Income</th><th>Expense</th><th>T-In</th><th>T-Out</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {monthly.map(m => (
                      <tr key={m.ym}>
                        <td>{m.ym}</td>
                        <td className="tx-amount">{fmt(m.income)}</td>
                        <td className="tx-amount kpi-negative">{fmt(m.expense)}</td>
                        <td className="tx-amount">{fmt(m.transferIn)}</td>
                        <td className="tx-amount kpi-negative">{fmt(m.transferOut)}</td>
                        <td className="tx-amount" style={{ fontWeight: 700 }}>{fmt(m.monthEndBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (One-page view) */}
              <div className="accounts-cards">
                {monthly.map(m => (
                  <div key={m.ym} className="account-card-mobile" style={{ background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid #eee', marginBottom: '10px', paddingBottom: '5px', color: '#2C4C3B' }}>{m.ym} Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                      <div><span style={{ color: '#888' }}>In:</span> <span style={{ color: '#2C4C3B' }}>+{fmt(m.income + m.transferIn)}</span></div>
                      <div><span style={{ color: '#888' }}>Out:</span> <span style={{ color: '#ff6b6b' }}>-{fmt(m.expense + m.transferOut)}</span></div>
                      <div style={{ gridColumn: 'span 2', paddingTop: '5px', borderTop: '1px dashed #eee', marginTop: '5px', fontWeight: 700 }}>
                        End Balance: {fmt(m.monthEndBalance)} {currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions Section */}
            <div className="transaction-list">
              <h2>Transactions</h2>
              {/* Desktop Table */}
              <div className="tx-table-wrap accounts-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Dir</th><th>Account</th><th>Amount (Local / USD)</th></tr>
                  </thead>
                  <tbody>
                    {relatedTransactionsDesc.map(t => (
                      <tr key={t.id}>
                        <td>{t.date}</td><td>{t.type}</td>
                        <td><span className={t.accountId === id && (t.type === 'expense' || t.type === 'transfer') ? 'tx-dir-out' : 'tx-dir-in'}>{t.accountId === id && (t.type === 'expense' || t.type === 'transfer') ? 'Out' : 'In'}</span></td>
                        <td>{t.type === 'transfer' ? (t.accountId === id ? accountNameById.get(t.accountToId) : accountNameById.get(t.accountId)) : '-'}</td>
                        <td><AmountCell t={t} accountId={id} accountCurrency={currency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Transactions (One-page view) */}
              <div className="accounts-cards">
                {relatedTransactionsDesc.map(t => (
                  <div key={t.id} className="account-card-mobile" style={{ background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: `5px solid ${t.accountId === id && (t.type === 'expense' || t.type === 'transfer') ? '#ff6b6b' : '#2C4C3B'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>{t.date} • {t.type}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f0f0f0' }}>
                        {t.accountId === id && (t.type === 'expense' || t.type === 'transfer') ? 'OUT' : 'IN'}
                      </span>
                    </div>
                    <AmountCell t={t} accountId={id} accountCurrency={currency} isMobile={true} />
                    {t.type === 'transfer' && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                        {t.accountId === id ? `To: ${accountNameById.get(t.accountToId)}` : `From: ${accountNameById.get(t.accountId)}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountDetailPage;