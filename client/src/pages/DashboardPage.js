import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import '../pages/Dashboard.css';

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

  // ✅ new schema: accountId / accountToId
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    accountId: '',
    accountToId: '',
    member: 'You',
    type: 'expense',
    note: '',
  });

  const didLoadRef = useRef(false);

  const accountNameById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => {
      if (a?.id) m.set(a.id, a.name);
    });
    return m;
  }, [accounts]);

  const loadInitial = async () => {
    try {
      setError('');
      setLoading(true);

      const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);

      const acctList = Array.isArray(acct) ? acct : [];
      const txList = Array.isArray(tx) ? tx : [];

      setAccounts(acctList);
      setTransactions(txList);

      const firstAccountId = acctList.length ? acctList[0].id : '';
      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || firstAccountId,
        accountToId: prev.accountToId || '',
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

    const payload = {
      date: formData.date,
      amount: Number(formData.amount),
      type: transactionType,
      category: formData.category,
      accountId: formData.accountId,
      accountToId: transactionType === 'transfer' ? formData.accountToId : '',
      member: formData.member,
      note: formData.note,
    };

    try {
      setSubmitting(true);
      await transactionsAPI.create(payload);

      const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);
      setAccounts(Array.isArray(acct) ? acct : []);
      setTransactions(Array.isArray(tx) ? tx : []);

      setFormData((prev) => ({
        ...prev,
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        note: '',
        type: transactionType,
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
      const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);
      setAccounts(Array.isArray(acct) ? acct : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch (e) {
      setError(e?.message || 'Failed to delete transaction');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];

    // prefer `type`; fallback to old data that might have `category` incorrectly holding type
    list = list.filter((t) => (t.type || t.category) === transactionType);

    list = list.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [transactions, transactionType, sortOrder]);

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn active">Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>
            Split
          </button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>
            Analytics
          </button>
          <button className="nav-btn" onClick={() => navigate('/account')}>
            Accounts
          </button>
          {currentUser && <span className="user-email">{currentUser.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
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
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount</label>
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
                      <select
                        name="accountId"
                        value={formData.accountId}
                        onChange={handleInputChange}
                        className="form-input"
                      >
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="manage-accounts-btn"
                        onClick={() => navigate('/account')}
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                </div>

                {transactionType === 'transfer' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>To Account</label>
                      <select
                        name="accountToId"
                        value={formData.accountToId}
                        onChange={handleInputChange}
                        className="form-input"
                      >
                        <option value="">Select account</option>
                        {(accounts || [])
                          .filter((acc) => !acc.archived)
                          .filter((acc) => acc.id && acc.id !==
                        formData.accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="form-input"
                      >
                        <option value="">Select Category</option>
                        {customCategories[transactionType].map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="add-category-btn"
                        onClick={() => setShowAddCategory(!showAddCategory)}
                      >
                        ➕
                      </button>
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
                        <button type="button" className="add-btn" onClick={handleAddCategory}>
                          Add
                        </button>
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
                    <input
                      type="text"
                      name="member"
                      value={formData.member}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Note</label>
                    <input
                      type="text"
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      placeholder="Enter note"
                      className="form-input"
                    />
                  </div>
                </div>

                <button type="submit" className="add-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Transaction'}
                </button>
              </form>
            </div>

            <div className="transaction-tabs">
              <button
                className={`tab ${transactionType === 'expense' ? 'active' : ''}`}
                onClick={() => handleTypeChange('expense')}
              >
                💸 Expense
              </button>
              <button
                className={`tab ${transactionType === 'income' ? 'active' : ''}`}
                onClick={() => handleTypeChange('income')}
              >
                💰 Income
              </button>
              <button
                className={`tab ${transactionType === 'transfer' ? 'active' : ''}`}
                onClick={() => handleTypeChange('transfer')}
              >
                🔄 Transfer
              </button>
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
                  {/* Desktop / Tablet: Table */}
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
                          // ✅ fallback chain: new snapshot -> id lookup -> old fields -> raw -> ''
                          const fromName =
                            t.accountName ||
                            accountNameById.get(t.accountId) ||
                            t.account ||
                            t.accountId ||
                            '';

                          const toName =
                            t.accountToName ||
                            accountNameById.get(t.accountToId) ||
                            t.accountTo ||
                            t.accountToId ||
                            '';

                          const accountLabel =
                            t.type === 'transfer' && toName ? `${fromName} → ${toName}` : fromName;

                          const amount = Number(t.amount) || 0;

                          return (
                            <tr key={t.id}>
                              <td className="tx-nowrap">{t.date}</td>
                              <td className="tx-nowrap">{t.type}</td>
                              <td>{t.category}</td>
                              <td>{accountLabel}</td>
                              <td>{t.note || ''}</td>
                              <td className="tx-amount">{amount.toFixed(2)}</td>
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

                  {/* Mobile: Cards */}
                  <div className="tx-cards">
                    {filteredTransactions.map((t) => {
                      const fromName =
                        t.accountName ||
                        accountNameById.get(t.accountId) ||
                        t.account ||
                        t.accountId ||
                        '';

                      const toName =
                        t.accountToName ||
                        accountNameById.get(t.accountToId) ||
                        t.accountTo ||
                        t.accountToId ||
                        '';

                      const accountLabel =
                        t.type === 'transfer' && toName ? `${fromName} → ${toName}` : fromName;

                      const amount = Number(t.amount) || 0;

                      return (
                        <div key={t.id} className="tx-card">
                          <div className="tx-card-top">
                            <div className="tx-card-title">
                              <strong>{t.category}</strong>
                              <span className="tx-card-sub">
                                {t.type} • {accountLabel}
                              </span>
                            </div>
                            <div className="tx-card-amount">{amount.toFixed(2)}</div>
                          </div>

                          <div className="tx-card-meta">
                            <span>{t.date}</span>
                            {t.note ? <span>• {t.note}</span> : null}
                          </div>

                          <div className="tx-card-actions">
                            <button className="delete-btn" onClick={() => handleDeleteTransaction(t.id)}>
                              Delete
                            </button>
                          </div>
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

export default DashboardPage;