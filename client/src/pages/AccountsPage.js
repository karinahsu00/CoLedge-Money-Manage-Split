import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ─── AccountBalance ───────────────────────────────────────────────────────────
// Displays: XX.XX USD + (YY.YY LocalCurrency) when currency ≠ USD
// `runningBal` is the transaction-derived balance (passed in from runningBalanceMap)
const AccountBalance = ({ a, runningBal }) => {
  const bal    = safeNum(runningBal ?? a.initialBalance, 0);
  const fxRate = safeNum(a.fxRateToUSD, 1);
  const usdBal = bal * fxRate;

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
  const [accounts, setAccounts]         = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // null = closed, {...} = account being edited
  const [showAddForm, setShowAddForm]   = useState(false);
  const [addForm, setAddForm]           = useState({ name: '', type: 'cash', currency: 'USD', initialBalance: '' });
  const [editForm, setEditForm]         = useState({ name: '', type: 'cash', currency: 'USD', initialBalance: '' });

  const loadAccounts = async () => {
    const [acctRes, txRes] = await Promise.all([
      accountsAPI.getAll(),
      transactionsAPI.getAll(),
    ]);
    setAccounts(acctRes?.data ?? acctRes ?? []);
    setTransactions(Array.isArray(txRes) ? txRes : []);
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  // ── Running Balance per account ─────────────────────────────────────────────
  // Mirrors AccountDetailPage logic exactly:
  //   running = initialBalance + income + transferIn - expense - transferOut
  // All figures kept in the account's LOCAL currency.
  const runningBalanceMap = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(a => {
      let running = safeNum(a.initialBalance, 0);
      (transactions || [])
        .filter(t => t.accountId === a.id || t.accountToId === a.id)
        .sort((x, y) => new Date(x.date) - new Date(y.date))
        .forEach(t => {
          const amt = safeNum(t.amount, 0);
          if (t.type === 'income' && t.accountId === a.id) {
            running += amt;
          } else if (t.type === 'expense' && t.accountId === a.id) {
            running -= amt;
          } else if (t.type === 'transfer') {
            if (t.accountId === a.id) {
              running -= safeNum(t.fromAmount || t.amount, 0);
            } else {
              running += safeNum(t.toAmount   || t.amount, 0);
            }
          }
        });
      map.set(a.id, running);
    });
    return map;
  }, [accounts, transactions]);

  // Total net worth: sum of each account's RUNNING balance converted to USD
  const totalUSD = useMemo(() =>
    (accounts || []).reduce((sum, a) => {
      const running = runningBalanceMap.get(a.id) ?? safeNum(a.initialBalance, 0);
      return sum + running * safeNum(a.fxRateToUSD, 1);
    }, 0),
  [accounts, runningBalanceMap]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.currency) return alert('Please fill in Name and Currency.');
    try {
      setSubmitting(true);
      await accountsAPI.create({
        name:           addForm.name,
        type:           addForm.type,
        currency:       addForm.currency.toUpperCase().trim(),
        initialBalance: Number(addForm.initialBalance || 0),
        balance:        Number(addForm.initialBalance || 0),
      });
      await loadAccounts();
      setAddForm({ name: '', type: 'cash', currency: 'USD', initialBalance: '' });
      setShowAddForm(false);
    } catch (err) {
      alert('Failed to create account: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (a) => {
    setEditForm({ name: a.name, type: a.type, currency: a.currency, initialBalance: a.initialBalance ?? 0 });
    setEditingAccount(a);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name) return alert('Name is required.');
    try {
      setSubmitting(true);
      await accountsAPI.update(editingAccount.id, {
        name:           editForm.name,
        type:           editForm.type,
        currency:       editForm.currency.toUpperCase().trim(),
        initialBalance: Number(editForm.initialBalance || 0),
      });
      await loadAccounts();
      setEditingAccount(null);
    } catch (err) {
      alert('Failed to update account: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* ── Edit Account Modal ── */}
        {editingAccount && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', padding: '30px',
              width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              <h2 style={{ marginBottom: '20px', color: '#2C4C3B' }}>✏️ Edit Account</h2>
              <form onSubmit={handleEdit}>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Account name"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Type</label>
                    <select
                      className="form-input"
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="debit">Debit Card</option>
                      <option value="credit">Credit Card</option>
                      <option value="investment">Investment</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Currency</label>
                    <input
                      className="form-input"
                      type="text"
                      value={editForm.currency}
                      onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                      placeholder="USD, NTD, JPY…"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Initial Balance</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={editForm.initialBalance}
                      onChange={e => setEditForm({ ...editForm, initialBalance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="nav-btn"
                    onClick={() => setEditingAccount(null)}
                    style={{ padding: '8px 20px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="add-btn"
                    disabled={submitting}
                    style={{ padding: '8px 24px' }}
                  >
                    {submitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

          {/* ── Add Account toggle ── */}
          <div style={{ marginTop: '20px' }}>
            {!showAddForm ? (
              <button
                className="add-btn"
                onClick={() => setShowAddForm(true)}
                style={{ padding: '8px 24px' }}
              >
                + Add Account
              </button>
            ) : (
              <div style={{ marginTop: '10px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '16px', color: '#2C4C3B' }}>New Account</h3>
                <form onSubmit={handleAdd}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Name *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={addForm.name}
                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                        placeholder="e.g. 現金"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Type</label>
                      <select
                        className="form-input"
                        value={addForm.type}
                        onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                      >
                        <option value="cash">Cash</option>
                        <option value="debit">Debit Card</option>
                        <option value="credit">Credit Card</option>
                        <option value="investment">Investment</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Currency *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={addForm.currency}
                        onChange={e => setAddForm({ ...addForm, currency: e.target.value })}
                        placeholder="USD, NTD, JPY…"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Initial Balance</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={addForm.initialBalance}
                        onChange={e => setAddForm({ ...addForm, initialBalance: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button type="submit" className="add-btn" disabled={submitting}>
                      {submitting ? 'Creating…' : 'Create Account'}
                    </button>
                    <button
                      type="button"
                      className="nav-btn"
                      onClick={() => { setShowAddForm(false); setAddForm({ name: '', type: 'cash', currency: 'USD', initialBalance: '' }); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <td><AccountBalance a={a} runningBal={runningBalanceMap.get(a.id)} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="nav-btn"
                        style={{ padding: '4px 14px', fontSize: '13px' }}
                        onClick={e => { e.stopPropagation(); openEdit(a); }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — full detail restored */}
          <div className="accounts-cards">
            {accounts.map(a => {
              const bal    = safeNum(runningBalanceMap.get(a.id) ?? a.initialBalance, 0);
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
                    <AccountBalance a={a} runningBal={runningBalanceMap.get(a.id)} />
                  </div>

                  {/* Row 2: FX rate + Edit button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    {a.currency !== 'USD' ? (
                      <div style={{ fontSize: '11px', color: '#bbb' }}>
                        1 {a.currency} = {fxRate.toFixed(4)} USD
                      </div>
                    ) : <div />}
                    <button
                      className="nav-btn"
                      style={{ padding: '3px 12px', fontSize: '12px' }}
                      onClick={e => { e.stopPropagation(); openEdit(a); }}
                    >
                      Edit
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

export default AccountsPage;