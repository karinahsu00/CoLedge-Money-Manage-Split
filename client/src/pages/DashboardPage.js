import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI, fxAPI } from '../config/api';
import '../pages/Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const EMPTY_EDIT = {
  date: '',
  type: 'expense',
  category: '',
  accountId: '',
  accountToId: '',
  member: 'You',
  note: '',
  amount: '',
  toAmount: '',
  fxRate: '',
  fromCurrency: '',
  toCurrency: '',
  fxAuto: true,
};

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const fmt2 = (n) => safeNum(n, 0).toFixed(2);

/**
 * For non-transfer: show local + optional USD (if known)
 */
const getNonTransferDisplay = (t, accountCurrencyFallback = 'USD') => {
  const type = t?.type || '';
  const localAmount = safeNum(t?.amount, 0);
  const localCurrency = t?.currency || accountCurrencyFallback || 'USD';
  const isOut = type === 'expense';

  let usdAmount = null;
  if (t?.usdAmount != null) usdAmount = safeNum(t.usdAmount, null);
  else if (t?.fxRateToUSD != null) usdAmount = localAmount * safeNum(t.fxRateToUSD, 0);
  else if (localCurrency === 'USD') usdAmount = localAmount;

  return { localAmount, localCurrency, usdAmount, isOut };
};

/**
 * For transfer: always show BOTH sides (from + to) if possible.
 * We do NOT force USD conversion here; we show the actual currencies involved.
 */
const getTransferAmountLines = (t, fromAccCurrencyFallback = 'USD') => {
  const fromAmount = t?.fromAmount != null ? safeNum(t.fromAmount, safeNum(t?.amount, 0)) : safeNum(t?.amount, 0);
  const fromCurrency = t?.fromCurrency || fromAccCurrencyFallback || 'USD';

  // if toAmount/toCurrency exist, show them; otherwise, omit second line
  const toAmount = t?.toAmount != null ? safeNum(t.toAmount, null) : null;
  const toCurrency = t?.toCurrency || '';

  return {
    fromAmount,
    fromCurrency,
    toAmount,
    toCurrency,
  };
};

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [transactionType, setTransactionType] = useState('expense');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [customCategories, setCustomCategories] = useState({
    expense: ['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Other'],
    income: ['Salary', 'Bonus', 'Interest', 'Other'],
    transfer: ['Internal Transfer'],
  });

  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    accountId: '',
    accountToId: '',
    member: 'You',
    type: 'expense',
    note: '',
    toAmount: '',
    fxRate: '',
    fromCurrency: '',
    toCurrency: '',
    fxAuto: true,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const didLoadRef = useRef(false);

  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => {
      if (a?.id) m.set(a.id, a);
    });
    return m;
  }, [accounts]);

  const accountNameById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => {
      if (a?.id) m.set(a.id, a.name);
    });
    return m;
  }, [accounts]);

  const reloadAll = async () => {
    const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);
    setAccounts(Array.isArray(acct) ? acct : []);
    setTransactions(Array.isArray(tx) ? tx : []);
    return { acct, tx };
  };

  const loadInitial = async () => {
    try {
      setError('');
      setLoading(true);

      const { acct } = await reloadAll();
      const acctList = Array.isArray(acct) ? acct : [];

      const firstAccountId = acctList.length ? acctList[0].id : '';
      const firstAcc = acctList.find((a) => a.id === firstAccountId);
      const firstCur = firstAcc?.currency || 'USD';

      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || firstAccountId,
        accountToId: prev.accountToId || '',
        fromCurrency: prev.fromCurrency || firstCur,
      }));
    } catch (e) {
      setError(e?.message || 'Failed to load accounts/transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fromCurrency = useMemo(() => {
    const a = accountById.get(formData.accountId);
    return a?.currency || formData.fromCurrency || 'USD';
  }, [accountById, formData.accountId, formData.fromCurrency]);

  const toCurrency = useMemo(() => {
    const a = accountById.get(formData.accountToId);
    return a?.currency || formData.toCurrency || 'USD';
  }, [accountById, formData.accountToId, formData.toCurrency]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fromCurrency,
      toCurrency,
    }));
  }, [fromCurrency, toCurrency]);

  // Auto FX for transfer (B3)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (transactionType !== 'transfer') return;
      if (!formData.fxAuto) return;
      if (!formData.accountId || !formData.accountToId) return;
      if (!formData.amount || Number.isNaN(Number(formData.amount))) return;

      try {
        const result = await fxAPI.getRate(fromCurrency, toCurrency);
        if (!alive) return;

        const rate = Number(result?.rate);
        if (!rate || Number.isNaN(rate)) return;

        const fromAmt = safeNum(formData.amount, 0);
        const computedTo = fromCurrency === toCurrency ? fromAmt : fromAmt * rate;

        setFormData((prev) => ({
          ...prev,
          fxRate: String(rate),
          toAmount: Number.isFinite(computedTo) ? computedTo.toFixed(2) : '',
        }));
      } catch (e) {
        console.error(e);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [
    transactionType,
    formData.amount,
    formData.accountId,
    formData.accountToId,
    formData.fxAuto,
    fromCurrency,
    toCurrency,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'toAmount') {
      setFormData((prev) => ({ ...prev, toAmount: value, fxAuto: false }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type) => {
    setTransactionType(type);
    setFormData((prev) => ({
      ...prev,
      type,
      category: '',
    }));
    setShowAddCategory(false);

    if (type !== 'transfer') {
      setFormData((prev) => ({
        ...prev,
        accountToId: '',
        toAmount: '',
        fxRate: '',
        fxAuto: true,
      }));
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !customCategories[transactionType].includes(newCategory)) {
      setCustomCategories((prev) => ({
        ...prev,
        [transactionType]: [...prev[transactionType], newCategory],
      }));
      setFormData((prev) => ({ ...prev, category: newCategory }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || !formData.category || !formData.accountId) {
      alert('Please fill in required fields');
      return;
    }

    if (transactionType === 'transfer' && !formData.accountToId) {
      alert('Please select "To Account"');
      return;
    }

    const basePayload = {
      date: formData.date,
      amount: Number(formData.amount),
      type: transactionType,
      category: formData.category,
      accountId: formData.accountId,
      accountToId: transactionType === 'transfer' ? formData.accountToId : '',
      member: formData.member,
      note: formData.note,
      createdAt: new Date().toISOString(),
    };

    const fxPayload =
      transactionType === 'transfer'
        ? {
            fromCurrency,
            toCurrency,
            fromAmount: Number(formData.amount),
            toAmount: formData.toAmount !== '' ? Number(formData.toAmount) : undefined,
            fxRate: formData.fxRate !== '' ? Number(formData.fxRate) : undefined,
          }
        : {
            currency: fromCurrency,
          };

    const payload = { ...basePayload, ...fxPayload };

    try {
      setSubmitting(true);
      await transactionsAPI.create(payload);
      await reloadAll();

      setFormData((prev) => ({
        ...prev,
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        note: '',
        type: transactionType,
        toAmount: '',
        fxRate: '',
        fxAuto: true,
      }));
    } catch (e2) {
      setError(e2?.message || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      setError('');
      await transactionsAPI.delete(id);
      await reloadAll();
    } catch (e) {
      setError(e?.message || 'Failed to delete transaction');
    }
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      date: t.date || '',
      type: t.type || 'expense',
      category: t.category || '',
      accountId: t.accountId || '',
      accountToId: t.accountToId || '',
      member: t.member || 'You',
      note: t.note || t.description || '',
      amount: t.amount != null ? String(t.amount) : '',
      toAmount: t.toAmount != null ? String(t.toAmount) : '',
      fxRate: t.fxRate != null ? String(t.fxRate) : '',
      fromCurrency: t.fromCurrency || t.currency || '',
      toCurrency: t.toCurrency || '',
      fxAuto: true,
    });
    setEditError('');
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_EDIT);
    setEditError('');
    setSavingEdit(false);
  };

  const handleEditChange = (field, value) => {
    if (field === 'toAmount') {
      setEditForm((prev) => ({ ...prev, toAmount: value, fxAuto: false }));
      return;
    }

    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'type' && value !== 'transfer') {
        updated.accountToId = '';
        updated.toAmount = '';
        updated.fxRate = '';
        updated.toCurrency = '';
        updated.fxAuto = true;
      }
      return updated;
    });
  };

  const editFromCurrency = useMemo(() => {
    const a = accountById.get(editForm.accountId);
    return a?.currency || editForm.fromCurrency || 'USD';
  }, [accountById, editForm.accountId, editForm.fromCurrency]);

  const editToCurrency = useMemo(() => {
    const a = accountById.get(editForm.accountToId);
    return a?.currency || editForm.toCurrency || 'USD';
  }, [accountById, editForm.accountToId, editForm.toCurrency]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!editingId) return;
      if (editForm.type !== 'transfer') return;
      if (!editForm.fxAuto) return;
      if (!editForm.accountId || !editForm.accountToId) return;
      if (!editForm.amount || Number.isNaN(Number(editForm.amount))) return;

      try {
        const result = await fxAPI.getRate(editFromCurrency, editToCurrency);
        if (!alive) return;

        const rate = Number(result?.rate);
        if (!rate || Number.isNaN(rate)) return;

        const fromAmt = safeNum(editForm.amount, 0);
        const computedTo = editFromCurrency === editToCurrency ? fromAmt : fromAmt * rate;

        setEditForm((prev) => ({
          ...prev,
          fxRate: String(rate),
          fromCurrency: editFromCurrency,
          toCurrency: editToCurrency,
          toAmount: Number.isFinite(computedTo) ? computedTo.toFixed(2) : '',
        }));
      } catch (e) {
        console.error(e);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [
    editingId,
    editForm.type,
    editForm.amount,
    editForm.accountId,
    editForm.accountToId,
    editForm.fxAuto,
    editFromCurrency,
    editToCurrency,
  ]);

  const validateEdit = () => {
    if (!editForm.date) return 'Date is required.';
    if (!editForm.accountId) return 'From Account is required.';
    if (!editForm.category) return 'Category is required.';
    if (editForm.amount === '' || Number.isNaN(Number(editForm.amount))) return 'Amount must be a number.';
    if (editForm.type === 'transfer' && !editForm.accountToId) return 'To Account is required for transfers.';
    if (editForm.type === 'transfer' && editForm.accountToId === editForm.accountId) {
      return 'To Account must be different from From Account.';
    }
    return '';
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    const msg = validateEdit();
    if (msg) {
      setEditError(msg);
      return;
    }

    try {
      setSavingEdit(true);

      const basePayload = {
        date: editForm.date,
        type: editForm.type,
        category: editForm.category,
        accountId: editForm.accountId,
        accountToId: editForm.type === 'transfer' ? editForm.accountToId : '',
        member: editForm.member,
        note: editForm.note,
        description: editForm.note,
        amount: Number(editForm.amount),
      };

      const fxPayload =
        editForm.type === 'transfer'
          ? {
              fromCurrency: editFromCurrency,
              toCurrency: editToCurrency,
              fromAmount: Number(editForm.amount),
              toAmount: editForm.toAmount !== '' ? Number(editForm.toAmount) : undefined,
              fxRate: editForm.fxRate !== '' ? Number(editForm.fxRate) : undefined,
            }
          : {
              currency: editFromCurrency,
            };

      const payload = { ...basePayload, ...fxPayload };

      await transactionsAPI.update(editingId, payload);
      await reloadAll();
      closeEdit();
    } catch (err) {
      setEditError(err?.message || 'Failed to update transaction.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];
    list = list.filter((t) => (t.type || t.category) === transactionType);

    list = list.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [transactions, transactionType, sortOrder]);

  return (
    <div className="dashboard-container record-page">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn active">Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
          {currentUser && <span className="user-email">{currentUser.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>📝 Record Transaction</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <h2>Loading...</h2>
        ) : (
          <>
            <div className="transaction-form-section">
              <h2>Add New Transaction</h2>

              <form onSubmit={handleAddTransaction} className="transaction-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label>Amount ({fromCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>From Account</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select name="accountId" value={formData.accountId} onChange={handleInputChange} className="form-input">
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                      <button type="button" className="manage-accounts-btn" onClick={() => navigate('/account')}>⚙️</button>
                    </div>
                  </div>
                </div>

                {transactionType === 'transfer' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>To Account</label>
                      <select name="accountToId" value={formData.accountToId} onChange={handleInputChange} className="form-input">
                        <option value="">Select account</option>
                        {(accounts || [])
                          .filter((acc) => !acc.archived)
                          .filter((acc) => acc.id && acc.id !== formData.accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>To Amount ({toCurrency})</label>
                      <input
                        type="number"
                        step="0.01"
                        name="toAmount"
                        value={formData.toAmount}
                        onChange={handleInputChange}
                        placeholder="Auto-calculated (you can override)"
                        className="form-input"
                      />

                      <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <small style={{ color: 'var(--color-text-muted, #656D4A)' }}>
                          Rate: {formData.fxRate ? `1 ${fromCurrency} ≈ ${Number(formData.fxRate).toFixed(6)} ${toCurrency}` : '—'}
                        </small>

                        {!formData.fxAuto && (
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={() => setFormData((prev) => ({ ...prev, fxAuto: true }))}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            Re-enable Auto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="form-input">
                        <option value="">Select Category</option>
                        {customCategories[transactionType].map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <button type="button" className="add-category-btn" onClick={() => setShowAddCategory(!showAddCategory)}>➕</button>
                    </div>

                    {showAddCategory && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Enter new category"
                          className="form-input"
                        />
                        <button type="button" className="add-btn" onClick={handleAddCategory}>Add</button>
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategory('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Member</label>
                    <input type="text" name="member" value={formData.member} onChange={handleInputChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label>Note</label>
                    <input type="text" name="note" value={formData.note} onChange={handleInputChange} placeholder="Enter note" className="form-input" />
                  </div>
                </div>

                <button type="submit" className="add-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Transaction'}
                </button>
              </form>
            </div>

            <div className="transaction-tabs">
              <button className={`tab ${transactionType === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>💸 Expense</button>
              <button className={`tab ${transactionType === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>💰 Income</button>
              <button className={`tab ${transactionType === 'transfer' ? 'active' : ''}`} onClick={() => handleTypeChange('transfer')}>🔄 Transfer</button>
            </div>

            <div className="transaction-list">
              <div className="tx-header">
                <h2 style={{ margin: 0 }}>Transactions</h2>
                <div>
                  <label style={{ marginRight: 8 }}>Sort:</label>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="desc">Newest</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <p>No transactions yet.</p>
              ) : (
                <>
                  <div className="tx-table-wrap">
                    <table className="tx-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Account</th>
                          <th>Note</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredTransactions.map((t) => {
                          const fromAcc = accountById.get(t.accountId);
                          const fromAccCurrency = fromAcc?.currency || t.fromCurrency || t.currency || 'USD';

                          const fromName =
                            t.accountName || accountNameById.get(t.accountId) || t.account || t.accountId || '';

                          const toName =
                            t.accountToName || accountNameById.get(t.accountToId) || t.accountTo || t.accountToId || '';

                          const accountLabel =
                            t.type === 'transfer' && toName ? `${fromName} → ${toName}` : fromName;

                          const amount = Number(t.amount) || 0;
                          const localCurrency = t.currency || t.fromCurrency || 'USD';
                          const usdAmt = t.usdAmount != null ? Number(t.usdAmount) : null;
                          const showUSD = usdAmt != null && localCurrency !== 'USD';

                          return (
                            <tr key={t.id}>
                              <td className="tx-nowrap">{t.date}</td>
                              <td className="tx-nowrap">{t.type}</td>
                              <td>{t.category}</td>
                              <td>{accountLabel}</td>
                              <td>{t.note || ''}</td>
                              <td>
                                <div className="tx-amount-cell">
                                  <span className="tx-amount-local">{amount.toFixed(2)} {localCurrency}</span>
                                  {showUSD && <span className="tx-amount-usd">{usdAmt.toFixed(2)} USD</span>}
                                </div>
                              </td>
                              <td>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteTransaction(t.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="tx-cards">
                    {filteredTransactions.map((t) => {
                      const fromAcc = accountById.get(t.accountId);
                      const fromAccCurrency = fromAcc?.currency || t.fromCurrency || t.currency || 'USD';

                      const fromName =
                        t.accountName || accountNameById.get(t.accountId) || t.account || t.accountId || '';

                      const toName =
                        t.accountToName || accountNameById.get(t.accountToId) || t.accountTo || t.accountToId || '';

                      const accountLabel =
                        t.type === 'transfer' && toName ? `${fromName} → ${toName}` : fromName;

                      const amount = Number(t.amount) || 0;
                      const mobileLocalCurrency = t.currency || t.fromCurrency || 'USD';
                      const mobileUsdAmt = t.usdAmount != null ? Number(t.usdAmount) : null;
                      const mobileShowUSD = mobileUsdAmt != null && mobileLocalCurrency !== 'USD';

                      return (
                        <div key={t.id} className="tx-card">
                          <div className="tx-card-top">
                            <div className="tx-card-title">
                              <strong>{t.category}</strong>
                              <span className="tx-card-sub">
                                {t.type} • {accountLabel}
                              </span>
                            </div>
                            <div className="tx-card-amount">
                              <div>{amount.toFixed(2)} {mobileLocalCurrency}</div>
                              {mobileShowUSD && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mobileUsdAmt.toFixed(2)} USD</div>}
                            </div>
                          </div>

                          <div className="tx-card-meta">
                            <span>{t.date}</span>
                            {t.note ? <span>• {t.note}</span> : null}
                          </div>

                          <div className="tx-card-actions">
                            <button className="edit-btn" onClick={() => openEdit(t)}>Edit</button>
                            <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)}>Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {editingId && (
              <div className="modal-overlay" role="dialog" aria-modal="true">
                <div className="modal">
                  <div className="modal-header">
                    <h3>Edit Transaction</h3>
                    <button className="modal-close" onClick={closeEdit} aria-label="Close">✕</button>
                  </div>

                  {editError && <div className="error-message">{editError}</div>}

                  <form onSubmit={handleSaveEdit} className="modal-form">
                    <div className="modal-grid">
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" value={editForm.date} onChange={(e) => handleEditChange('date', e.target.value)} className="form-input" />
                      </div>

                      <div className="form-group">
                        <label>Type</label>
                        <select value={editForm.type} onChange={(e) => handleEditChange('type', e.target.value)} className="form-input">
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                          <option value="transfer">transfer</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>From Account</label>
                        <select value={editForm.accountId} onChange={(e) => handleEditChange('accountId', e.target.value)} className="form-input">
                          <option value="">Select account</option>
                          {(accounts || []).map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      {editForm.type === 'transfer' && (
                        <div className="form-group">
                          <label>To Account</label>
                          <select value={editForm.accountToId} onChange={(e) => handleEditChange('accountToId', e.target.value)} className="form-input">
                            <option value="">Select account</option>
                            {(accounts || [])
                              .filter((acc) => !acc.archived)
                              .filter((acc) => acc.id && acc.id !== editForm.accountId)
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                          </select>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Category</label>
                        <select value={editForm.category} onChange={(e) => handleEditChange('category', e.target.value)} className="form-input">
                          <option value="">Select Category</option>
                          {(customCategories[editForm.type] || []).map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Member</label>
                        <input type="text" value={editForm.member} onChange={(e) => handleEditChange('member', e.target.value)} className="form-input" />
                      </div>

                      <div className="form-group">
                        <label>Note</label>
                        <input type="text" value={editForm.note} onChange={(e) => handleEditChange('note', e.target.value)} className="form-input" />
                      </div>

                      <div className="form-group">
                        <label>Amount ({editFromCurrency})</label>
                        <input type="number" step="0.01" value={editForm.amount} onChange={(e) => handleEditChange('amount', e.target.value)} className="form-input" />
                      </div>

                      {editForm.type === 'transfer' && (
                        <div className="form-group">
                          <label>To Amount ({editToCurrency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.toAmount}
                            onChange={(e) => handleEditChange('toAmount', e.target.value)}
                            className="form-input"
                            placeholder="Auto-calculated (you can override)"
                          />
                          <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <small style={{ color: 'var(--color-text-muted, #656D4A)' }}>
                              Rate: {editForm.fxRate ? `1 ${editFromCurrency} ≈ ${Number(editForm.fxRate).toFixed(6)} ${editToCurrency}` : '—'}
                            </small>
                            {!editForm.fxAuto && (
                              <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setEditForm((prev) => ({ ...prev, fxAuto: true }))}
                                style={{ padding: '6px 10px', fontSize: 12 }}
                              >
                                Re-enable Auto
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={closeEdit} disabled={savingEdit}>Cancel</button>
                      <button type="submit" className="add-btn" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <MobileTabBar />
    </div>
  );
};

export default DashboardPage;
