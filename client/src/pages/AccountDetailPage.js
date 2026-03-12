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

/**
 * Compute the display amounts for a transaction row.
 *
 * @param {Object} t - The transaction object
 * @param {string} accountId - The ID of the account currently being viewed
 * @param {string} accountCurrency - The currency code of the viewed account
 * @returns {{ localAmount: number, localCurrency: string, usdAmount: number|null, isOut: boolean }}
 *   localAmount/localCurrency: amount in the account's native currency;
 *   usdAmount: USD equivalent (null when unknown);
 *   isOut: true when the amount leaves the viewed account.
 */
const getAmountDisplay = (t, accountId, accountCurrency) => {
  const cur = accountCurrency || 'USD';
  let localAmount, localCurrency, usdAmount, isOut;

  if (t.type === 'transfer') {
    if (t.accountId === accountId) {
      // Viewing the source side
      localAmount = t.fromAmount != null ? Number(t.fromAmount) : Number(t.amount || 0);
      localCurrency = t.fromCurrency || cur;
      isOut = true;
    } else {
      // Viewing the destination side
      localAmount = t.toAmount != null ? Number(t.toAmount) : Number(t.amount || 0);
      localCurrency = t.toCurrency || cur;
      isOut = false;
    }
    // USD: prefer explicit usdAmount
    if (t.usdAmount != null) {
      usdAmount = Number(t.usdAmount);
    } else if (localCurrency === 'USD') {
      usdAmount = localAmount;
    } else {
      usdAmount = null;
    }
  } else {
    localAmount = Number(t.amount || 0);
    localCurrency = t.currency || cur;
    isOut = t.type === 'expense';
    if (t.usdAmount != null) {
      usdAmount = Number(t.usdAmount);
    } else if (t.fxRateToUSD != null) {
      usdAmount = localAmount * Number(t.fxRateToUSD);
    } else if (localCurrency === 'USD') {
      usdAmount = localAmount;
    } else {
      usdAmount = null;
    }
  }

  return { localAmount, localCurrency, usdAmount, isOut };
};

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

    // ✅ for running balance, sort ASC by (date, createdAt, id)
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

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transferIn = 0;
    let transferOut = 0;

    relatedTransactions.forEach((t) => {
      const amount = Number(t.amount || 0);

      if (t.type === 'income' && t.accountId === id) income += amount;
      if (t.type === 'expense' && t.accountId === id) expense += amount;

      if (t.type === 'transfer') {
        if (t.accountId === id) transferOut += amount;
        if (t.accountToId === id) transferIn += amount;
      }
    });

    return { income, expense, transferIn, transferOut };
  }, [relatedTransactions, id]);

  const monthly = useMemo(() => {
    const initial = Number(account?.initialBalance ?? 0); // old accounts default 0
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
        if (t.accountId === id) row.transferOut += amount;
        if (t.accountToId === id) row.transferIn += amount;
      }

      if (t.type === 'income' && t.accountId === id) running += amount;
      else if (t.type === 'expense' && t.accountId === id) running -= amount;
      else if (t.type === 'transfer') {
        if (t.accountId === id) running -= amount;
        if (t.accountToId === id) running += amount;
      }

      row.monthEndBalance = running;
    });

    return Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? 1 : -1));
  }, [relatedTransactions, id, account?.initialBalance]);

  const relatedTransactionsDesc = useMemo(() => {
    const rel = [...relatedTransactions];

    // ✅ for display, sort DESC by (date, createdAt, id)
    return rel.sort((a, b) => {
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
          <button
            className="add-btn"
            style={{ fontSize: 14, padding: '8px 16px' }}
            onClick={() => navigate('/account')}
          >
            ← Back to Accounts
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <h2>Loading...</h2>
        ) : !account ? (
          <p>Account not found.</p>
        ) : (
          <>
            <div className="transaction-form-section">
              <h2>Overview</h2>
              <div className="account-overview-grid">
                <div className={`account-kpi${Number(account.balance || 0) < 0 ? ' kpi-balance-neg' : ''}`}>
                  <div className="account-kpi-label">Current Balance</div>
                  <div className="account-kpi-value">
                    {Number(account.balance || 0).toFixed(2)}
                  </div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Initial Balance</div>
                  <div className="account-kpi-value">
                    {Number(account.initialBalance ?? 0).toFixed(2)}
                  </div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Type</div>
                  <div className="account-kpi-value">{accountTypeLabel(account.type)}</div>
                </div>

                <div className="account-kpi">
                  <div className="account-kpi-label">Currency</div>
                  <div className="account-kpi-value">{account.currency || 'USD'}</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }} className="account-overview-grid">
                <div className="account-kpi kpi-income">
                  <div className="account-kpi-label">Income</div>
                  <div className="account-kpi-value">{summary.income.toFixed(2)}</div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>
                <div className="account-kpi kpi-expense">
                  <div className="account-kpi-label">Expense</div>
                  <div className="account-kpi-value">{summary.expense.toFixed(2)}</div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>
                <div className="account-kpi kpi-income">
                  <div className="account-kpi-label">Transfer In</div>
                  <div className="account-kpi-value">{summary.transferIn.toFixed(2)}</div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>
                <div className="account-kpi kpi-expense">
                  <div className="account-kpi-label">Transfer Out</div>
                  <div className="account-kpi-value">{summary.transferOut.toFixed(2)}</div>
                  <div className="account-kpi-sub">{account.currency || 'USD'}</div>
                </div>
              </div>
            </div>

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
                        <th style={{ textAlign: 'right' }}>Income</th>
                        <th style={{ textAlign: 'right' }}>Expense</th>
                        <th style={{ textAlign: 'right' }}>Transfer In</th>
                        <th style={{ textAlign: 'right' }}>Transfer Out</th>
                        <th style={{ textAlign: 'right' }}>Month End Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((m) => (
                        <tr key={m.ym}>
                          <td className="tx-nowrap">{m.ym}</td>
                          <td className="tx-amount">{m.income.toFixed(2)}</td>
                          <td className="tx-amount">{m.expense.toFixed(2)}</td>
                          <td className="tx-amount">{m.transferIn.toFixed(2)}</td>
                          <td className="tx-amount">{m.transferOut.toFixed(2)}</td>
                          <td className="tx-amount">
                            {Number(m.monthEndBalance || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
                    Month End Balance uses (date, createdAt) ordering for same-day transactions.
                  </p>
                </div>
              )}
            </div>

            <div className="transaction-list">
              <h2>Transactions</h2>

              {relatedTransactionsDesc.length === 0 ? (
                <p>No transactions for this account yet.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="tx-table-wrap">
                    <table className="tx-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Direction</th>
                          <th>Other Account</th>
                          <th>Note</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
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

                          const { localAmount, localCurrency, usdAmount, isOut } =
                            getAmountDisplay(t, id, account.currency);
                          const amountClass = isOut ? 'amount-out' : 'amount-in';
                          const showUsd =
                            usdAmount != null && localCurrency !== 'USD';

                          return (
                            <tr key={t.id}>
                              <td className="tx-nowrap">{t.date}</td>
                              <td className="tx-nowrap">{t.type}</td>
                              <td>{t.category}</td>
                              <td className="tx-nowrap">{direction}</td>
                              <td>{other}</td>
                              <td>{t.note || ''}</td>
                              <td className="tx-amount">
                                <div className="tx-amount-cell">
                                  <span className={`tx-amount-local ${amountClass}`}>
                                    {localAmount.toFixed(2)} {localCurrency}
                                  </span>
                                  {showUsd && (
                                    <span className="tx-amount-usd">
                                      {usdAmount.toFixed(2)} USD
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="tx-cards">
                    {relatedTransactionsDesc.map((t) => {
                      let direction = '';
                      let other = '';

                      if (t.type === 'transfer') {
                        if (t.accountId === id) {
                          direction = 'Out';
                          other =
                            accountNameById.get(t.accountToId) ||
                            t.accountToId ||
                            '';
                        } else if (t.accountToId === id) {
                          direction = 'In';
                          other =
                            accountNameById.get(t.accountId) ||
                            t.accountId ||
                            '';
                        }
                      } else {
                        direction = t.type === 'income' ? 'In' : 'Out';
                      }

                      const { localAmount, localCurrency, usdAmount, isOut } =
                        getAmountDisplay(t, id, account.currency);
                      const amountClass = isOut ? 'amount-out' : 'amount-in';
                      const showUsd =
                        usdAmount != null && localCurrency !== 'USD';

                      return (
                        <div className="tx-card" key={t.id}>
                          <div className="tx-card-top">
                            <div className="tx-card-title">
                              <strong>{t.category}</strong>
                              <span className="tx-card-sub">
                                {t.date} · {t.type} · {direction}
                                {other ? ` · ${other}` : ''}
                              </span>
                            </div>
                            <div className="tx-card-amount">
                              <span className={`tx-card-amount-local ${amountClass}`}>
                                {localAmount.toFixed(2)} {localCurrency}
                              </span>
                              {showUsd && (
                                <span className="tx-card-amount-usd">
                                  {usdAmount.toFixed(2)} USD
                                </span>
                              )}
                            </div>
                          </div>
                          {t.note && (
                            <div className="tx-card-meta">{t.note}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountDetailPage;