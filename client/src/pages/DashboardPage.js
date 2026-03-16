import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI, fxAPI } from '../config/api';
import '../pages/Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ─── AmountDisplay ────────────────────────────────────────────────────────────
// Always shows: XX.XX USD (YY.YY LocalCurrency)
// Priority: stored usdAmount > amount * fxRateToUSD > amount * account rate
const AmountDisplay = ({ t, accountById }) => {
  const amount   = safeNum(t.amount, 0);
  const acc      = accountById.get(t.accountId);
  const accTo    = accountById.get(t.accountToId);

  // Use the pre-calculated usdAmount if available, otherwise derive it
  const fxRate   = safeNum(t.fxRateToUSD || acc?.fxRateToUSD, 1);
  const displayUSD = t.usdAmount != null
    ? safeNum(t.usdAmount)
    : amount * fxRate;

  const localCurrency = t.currency || acc?.currency || 'USD';

  if (t.type === 'transfer') {
    const toAmt    = safeNum(t.toAmount || t.amount);
    const toRate   = safeNum(accTo?.fxRateToUSD, 1);
    const toUSD    = toAmt * toRate;
    const toCur    = accTo?.currency || 'USD';

    return (
      <div style={{ textAlign: 'right', fontSize: '13px' }}>
        <div style={{ fontWeight: 600, color: '#2C4C3B' }}>
          {displayUSD.toFixed(2)} USD
          {localCurrency !== 'USD' && (
            <span style={{ fontSize: '0.85em', color: '#888', fontWeight: 400 }}>
              {' '}({amount.toFixed(2)} {localCurrency})
            </span>
          )}
        </div>
        <div style={{ color: '#888' }}>
          → {toUSD.toFixed(2)} USD
          {toCur !== 'USD' && (
            <span style={{ fontSize: '0.85em' }}>
              {' '}({toAmt.toFixed(2)} {toCur})
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontWeight: 600 }}>{displayUSD.toFixed(2)} USD</span>
      {localCurrency !== 'USD' && (
        <span style={{ color: '#888', fontSize: '0.85em', display: 'block' }}>
          ({amount.toFixed(2)} {localCurrency})
        </span>
      )}
    </div>
  );
};

// ─── DashboardPage ────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [transactionType, setTransactionType] = useState('expense');
  const [accounts, setAccounts]               = useState([]);
  const [transactions, setTransactions]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [submitting, setSubmitting]           = useState(false);
  const [formData, setFormData]               = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    accountId: '',
    accountToId: '',
    type: 'expense',
    note: '',
    toAmount: '',
    fxRate: '',
    fxAuto: true,
  });

  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a?.id) m.set(a.id, a); });
    return m;
  }, [accounts]);

  const reloadAll = async () => {
    const [acct, tx] = await Promise.all([
      accountsAPI.getAll(),
      transactionsAPI.getAll(),
    ]);
    setAccounts(Array.isArray(acct) ? acct : []);
    setTransactions(Array.isArray(tx) ? tx : []);
  };

  useEffect(() => { reloadAll().then(() => setLoading(false)); }, []);

  // Auto-fetch FX rate for transfers between different currencies
  useEffect(() => {
    const runFx = async () => {
      if (
        transactionType !== 'transfer' ||
        !formData.fxAuto ||
        !formData.amount ||
        !formData.accountId ||
        !formData.accountToId
      ) return;

      const fromCur = accountById.get(formData.accountId)?.currency;
      const toCur   = accountById.get(formData.accountToId)?.currency;
      if (!fromCur || !toCur || fromCur === toCur) {
        // Same currency — rate is 1
        setFormData(prev => ({
          ...prev,
          fxRate: 1,
          toAmount: safeNum(prev.amount).toFixed(2),
        }));
        return;
      }

      try {
        const res = await fxAPI.getRate(fromCur, toCur);
        const rate = safeNum(res?.rate, 1);
        setFormData(prev => ({
          ...prev,
          fxRate: rate,
          toAmount: (safeNum(prev.amount) * rate).toFixed(2),
        }));
      } catch (e) {
        console.error('FX fetch failed:', e);
      }
    };
    runFx();
  }, [
    formData.amount,
    formData.accountId,
    formData.accountToId,
    transactionType,
    formData.fxAuto,
    accountById,
  ]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountId) return alert('Please fill in amount and account.');

    try {
      setSubmitting(true);
      const acc     = accountById.get(formData.accountId);
      // fxRateToUSD: how many USD equals 1 unit of local currency
      // e.g. if currency is JPY, fxRateToUSD ≈ 0.0067
      const fxRate  = safeNum(acc?.fxRateToUSD, 1);
      const amount  = safeNum(formData.amount);
      const usdAmount = amount * fxRate;  // CORRECT: 30 JPY * 0.0067 ≈ 0.20 USD

      const payload = {
        ...formData,
        amount:      amount,
        usdAmount:   usdAmount,       // always store the USD-equivalent
        type:        transactionType,
        category:    transactionType === 'transfer' ? 'Internal Transfer' : formData.category,
        currency:    acc?.currency || 'USD',
        fxRateToUSD: fxRate,          // snapshot rate at time of recording
        createdAt:   new Date().toISOString(),
      };

      // For transfers, also store toAmount and the to-account's rate
      if (transactionType === 'transfer') {
        const accTo       = accountById.get(formData.accountToId);
        const toFxRate    = safeNum(accTo?.fxRateToUSD, 1);
        payload.toAmount  = safeNum(formData.toAmount || formData.amount);
        payload.toCurrency       = accTo?.currency || 'USD';
        payload.toFxRateToUSD    = toFxRate;
      }

      await transactionsAPI.create(payload);
      await reloadAll();
      setFormData(p => ({
        ...p,
        amount: '',
        note: '',
        category: '',
        toAmount: '',
        fxAuto: true,
      }));
    } catch (e) {
      console.error(e);
      alert('Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return (Array.isArray(transactions) ? transactions : [])
      .filter(t => t.type === transactionType)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, transactionType]);

  const selectedAccCurrency = accountById.get(formData.accountId)?.currency || 'USD';

  return (
    <div className="dashboard-container record-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn active" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn"        onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn"        onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn"        onClick={() => navigate('/account')}>Accounts</button>
          <button className="logout-btn"     onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>📝 Record Transaction</h1>
        </div>

        {/* ── Transaction Form ── */}
        <div className="transaction-form-section">
          <form onSubmit={handleAddTransaction} className="transaction-form">
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Amount ({selectedAccCurrency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Account</label>
                <select
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer-specific fields */}
            {transactionType === 'transfer' && (
              <div className="form-row">
                <div className="form-group">
                  <label>To Account</label>
                  <select
                    value={formData.accountToId}
                    onChange={e => setFormData({ ...formData, accountToId: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(acc => acc.id !== formData.accountId)
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    To Amount ({accountById.get(formData.accountToId)?.currency || '—'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.toAmount}
                    onChange={e =>
                      setFormData({ ...formData, toAmount: e.target.value, fxAuto: false })
                    }
                    className="form-input"
                    placeholder="0.00"
                  />
                  {formData.fxRate && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      Rate: 1 {selectedAccCurrency} ={' '}
                      {safeNum(formData.fxRate).toFixed(4)}{' '}
                      {accountById.get(formData.accountToId)?.currency || '—'}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-row">
              {transactionType !== 'transfer' && (
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select category</option>
                    {['Food', 'Transportation', 'Shopping', 'Utilities', 'Salary', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="form-input"
                  placeholder="Optional note"
                />
              </div>
            </div>

            <button type="submit" className="add-btn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Transaction'}
            </button>
          </form>
        </div>

        {/* ── Type Tabs ── */}
        <div className="transaction-tabs">
          <button
            className={`tab ${transactionType === 'expense'  ? 'active' : ''}`}
            onClick={() => setTransactionType('expense')}
          >💸 Expense</button>
          <button
            className={`tab ${transactionType === 'income'   ? 'active' : ''}`}
            onClick={() => setTransactionType('income')}
          >💰 Income</button>
          <button
            className={`tab ${transactionType === 'transfer' ? 'active' : ''}`}
            onClick={() => setTransactionType('transfer')}
          >🔄 Transfer</button>
        </div>

        {/* ── Transaction List ── */}
        <div className="transaction-list">
          <h2>Recent Transactions</h2>

          {/* Desktop table */}
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.category}</td>
                    <td>
                      {t.type === 'transfer'
                        ? `${accountById.get(t.accountId)?.name} → ${accountById.get(t.accountToId)?.name}`
                        : accountById.get(t.accountId)?.name}
                    </td>
                    <td><AmountDisplay t={t} accountById={accountById} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="delete-btn"
                        onClick={() => transactionsAPI.delete(t.id).then(reloadAll)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — full detail restored */}
          <div className="tx-cards">
            {filteredTransactions.map(t => {
              const acc      = accountById.get(t.accountId);
              const accTo    = accountById.get(t.accountToId);
              const fxRate   = safeNum(t.fxRateToUSD || acc?.fxRateToUSD, 1);
              const usdAmt   = t.usdAmount != null
                ? safeNum(t.usdAmount)
                : safeNum(t.amount) * fxRate;
              const localAmt = safeNum(t.amount);
              const localCur = t.currency || acc?.currency || 'USD';

              return (
                <div
                  key={t.id}
                  className="tx-card"
                  style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Row 1: category + amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, fontSize: '1em' }}>{t.category}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#2C4C3B' }}>
                        {usdAmt.toFixed(2)} USD
                      </div>
                      {localCur !== 'USD' && (
                        <div style={{ fontSize: '0.8em', color: '#888' }}>
                          ({localAmt.toFixed(2)} {localCur})
                        </div>
                      )}
                      {t.type === 'transfer' && accTo && (
                        <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                          → {(safeNum(t.toAmount) * safeNum(accTo.fxRateToUSD, 1)).toFixed(2)} USD
                          {accTo.currency !== 'USD' && ` (${safeNum(t.toAmount).toFixed(2)} ${accTo.currency})`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: date • account • note */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#888' }}>
                    <span>
                      {t.date} •{' '}
                      {t.type === 'transfer'
                        ? `${acc?.name} → ${accTo?.name}`
                        : acc?.name}
                    </span>
                    {t.note && <span style={{ fontStyle: 'italic' }}>{t.note}</span>}
                  </div>

                  {/* Row 3: delete */}
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <button
                      className="delete-btn"
                      onClick={() => transactionsAPI.delete(t.id).then(reloadAll)}
                    >
                      Delete
                    </button>
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

export default DashboardPage;