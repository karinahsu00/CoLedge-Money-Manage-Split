import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// fmt: display a local-currency amount to 2dp
const fmt = (n) => safeNum(n).toFixed(2);

const AccountDetailPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [account, setAccount]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);

  const loadData = async () => {
    const [acc, txList] = await Promise.all([
      accountsAPI.getById(id),
      transactionsAPI.getAll(),
    ]);
    setAccount(acc);
    setTransactions(txList.filter(t => t.accountId === id || t.accountToId === id));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // fxRateToUSD: how many USD = 1 local unit  (e.g. JPY → ~0.0067)
  const fxRate   = safeNum(account?.fxRateToUSD, 1);
  const currency = account?.currency || 'USD';

  // ── Running balance & summary (all figures kept in local currency) ──────────
  const { summary, runningBalance } = useMemo(() => {
    let inc = 0, exp = 0, tIn = 0, tOut = 0;
    let running = safeNum(account?.initialBalance, 0);

    [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(t => {
        const amt = safeNum(t.amount, 0);
        if (t.type === 'income' && t.accountId === id) {
          inc     += amt;
          running += amt;
        } else if (t.type === 'expense' && t.accountId === id) {
          exp     += amt;
          running -= amt;
        } else if (t.type === 'transfer') {
          if (t.accountId === id) {
            // money leaving this account (in this account's currency)
            const outAmt = safeNum(t.fromAmount || t.amount, 0);
            tOut    += outAmt;
            running -= outAmt;
          } else {
            // money arriving (toAmount is already in this account's currency)
            const inAmt = safeNum(t.toAmount || t.amount, 0);
            tIn     += inAmt;
            running += inAmt;
          }
        }
      });

    return { summary: { inc, exp, tIn, tOut }, runningBalance: running };
  }, [transactions, id, account]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  // For a transaction row: derive the USD amount and local amount
  const txAmounts = (t) => {
    const isTo = t.accountToId === id && t.type === 'transfer';
    // local amount relative to THIS account
    const localAmt = isTo
      ? safeNum(t.toAmount || t.amount)
      : safeNum(t.fromAmount || t.amount);

    // usd amount: prefer stored usdAmount for the originating side, recalculate for the receiving side
    let usdAmt;
    if (isTo) {
      // receiving side of transfer — use toAmount * this account's fxRate
      usdAmt = localAmt * fxRate;
    } else {
      usdAmt = t.usdAmount != null
        ? safeNum(t.usdAmount)
        : safeNum(t.amount) * safeNum(t.fxRateToUSD || fxRate, 1);
    }

    return { localAmt, usdAmt };
  };

  // sign indicator per transaction type
  const txSign = (t) => {
    if (t.type === 'income')  return '+';
    if (t.type === 'expense') return '-';
    if (t.type === 'transfer') return t.accountId === id ? '↑' : '↓';
    return '';
  };

  const txColor = (t) => {
    if (t.type === 'income')  return '#2C4C3B';
    if (t.type === 'expense') return '#c0392b';
    return '#888';
  };

  return (
    <div className="dashboard-container account-detail-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn"        onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn"        onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn"        onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active" onClick={() => navigate('/account')}>Accounts</button>
          <button className="logout-btn"     onClick={() => navigate('/login')}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>📒 {account?.name}</h1>
          <button className="add-btn" onClick={() => navigate('/account')}>← Back</button>
        </div>

        {/* ── Overview KPIs ── */}
        <div className="transaction-form-section">
          <h2>Overview</h2>
          <div
            className="account-overview-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}
          >
            <div className="account-kpi" style={{ borderLeft: '4px solid #2C4C3B' }}>
              <div className="account-kpi-label">Balance (USD)</div>
              {/* runningBalance is in local currency; multiply by fxRate to get USD */}
              <div className="account-kpi-value">{(runningBalance * fxRate).toFixed(2)}</div>
            </div>
            <div className="account-kpi">
              <div className="account-kpi-label">Balance ({currency})</div>
              <div className="account-kpi-value">{fmt(runningBalance)}</div>
            </div>
            <div className="account-kpi">
              <div className="account-kpi-label">Type</div>
              <div className="account-kpi-value">{accountTypeLabel(account?.type)}</div>
            </div>
            <div className="account-kpi">
              <div className="account-kpi-label">Initial ({currency})</div>
              <div className="account-kpi-value">{fmt(account?.initialBalance)}</div>
            </div>
          </div>

          {/* ── Statistics KPIs ── */}
          <h2 style={{ marginTop: '20px' }}>Statistics</h2>
          <div
            className="account-overview-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}
          >
            <div className="account-kpi kpi-income">
              <div className="account-kpi-label">Income ({currency})</div>
              <div className="account-kpi-value">+{fmt(summary.inc)}</div>
            </div>
            <div className="account-kpi kpi-expense">
              <div className="account-kpi-label">Expense ({currency})</div>
              <div className="account-kpi-value">-{fmt(summary.exp)}</div>
            </div>
            <div className="account-kpi kpi-income">
              <div className="account-kpi-label">Transfer In ({currency})</div>
              <div className="account-kpi-value">+{fmt(summary.tIn)}</div>
            </div>
            <div className="account-kpi kpi-expense">
              <div className="account-kpi-label">Transfer Out ({currency})</div>
              <div className="account-kpi-value">-{fmt(summary.tOut)}</div>
            </div>
          </div>
        </div>

        {/* ── Transactions ── */}
        <div className="transaction-list">
          <h2>Transactions</h2>

          {/* Desktop table */}
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount (USD)</th>
                  <th style={{ textAlign: 'right' }}>Amount ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(t => {
                    const { localAmt, usdAmt } = txAmounts(t);
                    const sign  = txSign(t);
                    const color = txColor(t);
                    return (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td style={{ textTransform: 'capitalize' }}>{t.type}</td>
                        <td>{t.category || '—'}</td>
                        <td style={{ textAlign: 'right', color, fontWeight: 600 }}>
                          {sign}{usdAmt.toFixed(2)} USD
                        </td>
                        <td style={{ textAlign: 'right', color: '#888' }}>
                          {sign}{localAmt.toFixed(2)} {currency}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — full detail */}
          <div className="accounts-cards">
            {transactions
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(t => {
                const { localAmt, usdAmt } = txAmounts(t);
                const sign  = txSign(t);
                const color = txColor(t);

                return (
                  <div
                    key={t.id}
                    className="account-card-mobile"
                    style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Row 1: type badge + amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            background: t.type === 'income' ? '#e8f5e9' : t.type === 'expense' ? '#fce4e4' : '#f0f0f0',
                            color: t.type === 'income' ? '#2C4C3B' : t.type === 'expense' ? '#c0392b' : '#555',
                          }}
                        >
                          {t.type}
                        </span>
                        {t.category && (
                          <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: 600 }}>
                            {t.category}
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color }}>
                          {sign}{usdAmt.toFixed(2)} USD
                        </div>
                        {currency !== 'USD' && (
                          <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                            {sign}{localAmt.toFixed(2)} {currency}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: date • note */}
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t.date}</span>
                      {t.note && <span style={{ fontStyle: 'italic' }}>{t.note}</span>}
                    </div>
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

export default AccountDetailPage;