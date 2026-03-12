import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import { accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';

const ym = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return 'Unknown';
  return dateStr.slice(0, 7); // YYYY-MM
};

const toTime = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Format a number to 2 decimal places */
const fmt = (n) => Number(n || 0).toFixed(2);

/**
 * Render an amount cell showing local currency on the left and USD on the right.
 * @param {object} t         - transaction object
 * @param {string} accountId - current account id (to detect transfer direction)
 * @param {string} accountCurrency - default currency for this account
 */
function AmountCell({ t, accountId, accountCurrency }) {
  let localAmount = null;
  let localCurrency = accountCurrency || 'USD';
  let usdAmount = null;

  if (t.type === 'transfer') {
    if (t.accountId === accountId) {
      // Transfer OUT from this account
      localAmount = Number(t.fromAmount ?? t.amount ?? 0);
      localCurrency = t.fromCurrency || accountCurrency || 'USD';
    } else {
      // Transfer IN to this account
      localAmount = Number(t.toAmount ?? t.amount ?? 0);
      localCurrency = t.toCurrency || accountCurrency || 'USD';
    }
  } else {
    // income / expense
    localAmount = Number(t.amount ?? 0);
    localCurrency = t.currency || accountCurrency || 'USD';
  }

  // USD amount: use explicit usdAmount if available, otherwise compute if we have the rate
  if (t.usdAmount != null) {
    usdAmount = Number(t.usdAmount);
  } else if (t.fxRateToUSD != null && localCurrency !== 'USD') {
    usdAmount = localAmount * Number(t.fxRateToUSD);
  } else if (localCurrency === 'USD') {
    usdAmount = localAmount;
  }

  const showUSD = usdAmount != null && localCurrency !== 'USD';

  return (
    <div className="tx-amount-cell">
      <span className="tx-amount-local">
        {fmt(localAmount)} {localCurrency}
      </span>
      {showUSD && (
        <span className="tx-amount-usd">{fmt(usdAmount)} USD</span>
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
      setError('');
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
      setError(e?.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const accountNameById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => {
      if (a?.id) m.set(a.id, a.name);
    });
    return m;
  }, [accounts]);

  const relatedTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    const rel = list.filter((t) => t && (t.accountId === id || t.accountToId === id));

    // for running balance, sort ASC by (date, createdAt, id)
    return rel.sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return da - db;

      const ca = toTime(a.createdAt);
      const cb = toTime(b.createdAt);
      if (ca !== cb) return ca - cb;

      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }, [transactions, id]);

  const currency = account?.currency || 'USD';

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transferIn = 0;
    let transferOut = 0;

    relatedTransactions.forEach((t) => {
      if (t.type === 'income' && t.accountId === id) income += Number(t.amount || 0);
      if (t.type === 'expense' && t.accountId === id) expense += Number(t.amount || 0);

      if (t.type === 'transfer') {
        if (t.accountId === id) transferOut += Number(t.fromAmount ?? t.amount ?? 0);
        if (t.accountToId === id) transferIn += Number(t.toAmount ?? t.amount ?? 0);
      }
    });

    return { income, expense, transferIn, transferOut };
  }, [relatedTransactions, id]);

  const monthly = useMemo(() => {
    const initial = Number(account?.initialBalance ?? 0);
    let running = initial;

    const map = new Map();

    const ensure = (key) => {
      if (!map.has(key)) {
        map.set(key, {
          ym: key,
          income: 0,
          expense: 0,
          transferIn: 0,
          transferOut: 0,
          monthEndBalance: initial,
        });
      }
      return map.get(key);
    };

    relatedTransactions.forEach((t) => {
      const key = ym(t.date);
      const row = ensure(key);
      const amount = Number(t.amount || 0);

      if (t.type === 'income' && t.accountId === id) row.income += amount;
      if (t.type === 'expense' && t.accountId === id) row.expense += amount;

      if (t.type === 'transfer') {
        if (t.accountId === id) row.transferOut += Number(t.fromAmount ?? amount);
        if (t.accountToId === id) row.transferIn += Number(t.toAmount ?? amount);
      }

      if (t.type === 'income' && t.accountId === id) running += amount;
      else if (t.type === 'expense' && t.accountId === id) running -= amount;
      else if (t.type === 'transfer') {
        if (t.accountId === id) running -= Number(t.fromAmount ?? amount);
        if (t.accountToId === id) running += Number(t.toAmount ?? amount);
      }

      row.monthEndBalance = running;
    });

    return Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? 1 : -1));
  }, [relatedTransactions, id, account?.initialBalance]);

  const relatedTransactionsDesc = useMemo(() => {
    return [...relatedTransactions].sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return db - da;

      const ca = toTime(a.createdAt);
      const cb = toTime(b.createdAt);
      if (ca !== cb) return cb - ca;

      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [relatedTransactions]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const title = account ? `${account.name}` : 'Account';
  const balance = Number(account?.balance || 0);

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>
            Record
          </button>
          <button className="nav-btn" onClick={() => navigate('/split')}>
            Split
          </button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>
            Analytics
          </button>
          <button className="nav-btn active" onClick={() => navigate('/account')}>
            Accounts
          </button>
          {currentUser && <span className="user-email">{currentUser.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div
          className="dashboard-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <h1 style={{ margin: 0 }}>📒 {title}</h1>
          <button className="nav-btn" onClick={() => navigate('/account')}>
            ← Back
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <h2>Loading...</h2>
        ) : !account ? (
          <p>Account not found.</p>
        ) : (
          <>
            {/* ── Overview KPIs ── */}
            <div className="transaction-form-section">
              <h2>Overview</h2>
              <div className="account-overview-grid">
                <div className="account-kpi">
                  <div className="account-kpi-label">Current Balance</div>
                  <div className={`account-kpi-value${balance < 0 ? ' kpi-negative' : ' kpi-positive'}`}>
                    {fmt(balance)} {currency}
                  </div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Initial Balance</div>
                  <div className="account-kpi-value">
                    {fmt(account.initialBalance ?? 0)} {currency}
                  </div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Type</div>
                  <div className="account-kpi-value">{accountTypeLabel(account.type)}</div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Currency</div>
                  <div className="account-kpi-value">{currency}</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }} className="account-overview-grid">
                <div className="account-kpi">
                  <div className="account-kpi-label">Income</div>
                  <div className="account-kpi-value kpi-income">
                    {fmt(summary.income)} {currency}
                  </div>
                </div>
                <div className="account-kpi">
                  <div className="account-kpi-label">Expense</div>
                  <div className="account-kpi-value kpi-expense">
                    {fmt(summary.expense)} {currency}
                  </div>
                </div>
                <div className="account-kpi">
                  <div className="account-kpi-label">Transfer In</div>
                  <div className="account-kpi-value kpi-income">
                    {fmt(summary.transferIn)} {currency}
                  </div>
                </div>
                <div className="account-kpi">
                  <div className="account-kpi-label">Transfer Out</div>
                  <div className="account-kpi-value kpi-expense">
                    {fmt(summary.transferOut)} {currency}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Monthly Summary ── */}
            <div className="transaction-list">
              <h2>Monthly Summary</h2>
              {monthly.length === 0 ? (
                <p>No transactions for this account yet.</p>
              ) : (
                <div className="tx-table-wrap">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th style={{ textAlign: 'right' }}>Income ({currency})</th>
                        <th style={{ textAlign: 'right' }}>Expense ({currency})</th>
                        <th style={{ textAlign: 'right' }}>Transfer In ({currency})</th>
                        <th style={{ textAlign: 'right' }}>Transfer Out ({currency})</th>
                        <th style={{ textAlign: 'right' }}>End Balance ({currency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((m) => (
                        <tr key={m.ym}>
                          <td className="tx-nowrap">{m.ym}</td>
                          <td className="tx-amount">{fmt(m.income)}</td>
                          <td className="tx-amount">{fmt(m.expense)}</td>
                          <td className="tx-amount">{fmt(m.transferIn)}</td>
                          <td className="tx-amount">{fmt(m.transferOut)}</td>
                          <td className="tx-amount">
                            {fmt(m.monthEndBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    End Balance uses (date, createdAt) ordering for same-day transactions.
                  </p>
                </div>
              )}
            </div>

            {/* ── Transactions Table ── */}
            <div className="transaction-list">
              <h2>Transactions</h2>

              {relatedTransactionsDesc.length === 0 ? (
                <p>No transactions for this account yet.</p>
              ) : (
                <div className="tx-table-wrap">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Dir</th>
                        <th>Other Account</th>
                        <th>Note</th>
                        <th>Amount (local / USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedTransactionsDesc.map((t) => {
                        let direction = '';
                        let other = '';

                        if (t.type === 'transfer') {
                          if (t.accountId === id) {
                            direction = 'Out';
                            other =
                              accountNameById.get(t.accountToId) ||
                              t.accountTo ||
                              t.accountToId ||
                              '';
                          } else if (t.accountToId === id) {
                            direction = 'In';
                            other =
                              accountNameById.get(t.accountId) ||
                              t.account ||
                              t.accountId ||
                              '';
                          }
                        } else {
                          direction = t.type === 'income' ? 'In' : 'Out';
                          other = '';
                        }

                        return (
                          <tr key={t.id}>
                            <td className="tx-nowrap">{t.date}</td>
                            <td className="tx-nowrap">{t.type}</td>
                            <td>{t.category}</td>
                            <td className="tx-nowrap">
                              {direction === 'In' ? (
                                <span className="tx-dir-in">In</span>
                              ) : (
                                <span className="tx-dir-out">Out</span>
                              )}
                            </td>
                            <td>{other}</td>
                            <td>{t.note || ''}</td>
                            <td>
                              <AmountCell t={t} accountId={id} accountCurrency={currency} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountDetailPage;


