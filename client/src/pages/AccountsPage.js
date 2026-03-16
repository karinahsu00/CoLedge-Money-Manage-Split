import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI } from '../config/api';
import { ACCOUNT_TYPES, accountTypeLabel } from '../constants/accountTypes';
import './Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const AccountsPage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // create form
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash',
    balance: 0,
    currency: 'USD',
  });

  // edit form
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'cash',
    currency: 'USD',
  });

  const loadAccounts = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await accountsAPI.getAll();
      const list = res?.data ?? res;
      setAccounts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const sortedAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? [...accounts] : [];
    return list.sort((a, b) => {
      const aa = Boolean(a?.archived);
      const bb = Boolean(b?.archived);
      if (aa !== bb) return aa ? 1 : -1;
      const an = (a?.name || '').toLowerCase();
      const bn = (b?.name || '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [accounts]);

  const totalBalance = useMemo(() => {
    return (accounts || []).reduce((sum, a) => sum + Number(a?.balance || 0), 0);
  }, [accounts]);

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Please enter account name');
    try {
      setSubmitting(true);
      const startingBalance = Number(formData.balance || 0);
      await accountsAPI.create({
        name: formData.name.trim(),
        type: formData.type,
        balance: startingBalance,
        initialBalance: startingBalance,
        currency: formData.currency || 'USD',
        archived: false,
      });
      setFormData({ name: '', type: 'cash', balance: 0, currency: 'USD' });
      await loadAccounts();
    } catch (e) {
      setError('Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (acc) => {
    setEditingId(acc.id);
    setEditForm({ name: acc.name || '', type: acc.type || 'cash', currency: acc.currency || 'USD' });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditForm({ name: '', type: 'cash', currency: 'USD' });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return alert('Name is required');
    try {
      setSubmitting(true);
      await accountsAPI.update(editingId, {
        name: editForm.name.trim(),
        type: editForm.type,
        currency: editForm.currency || 'USD',
      });
      cancelEdit();
      await loadAccounts();
    } catch (e) {
      setError('Failed to update account');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArchive = async (acc) => {
    try {
      setSubmitting(true);
      await accountsAPI.update(acc.id, { archived: !Boolean(acc.archived) });
      await loadAccounts();
    } catch (e) {
      setError('Failed to update account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="dashboard-container accounts-page">
      {/* Navbar (Hidden on Mobile via CSS) */}
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header"><h1>🏷️ Accounts</h1></div>

        {error && <div className="error-message">{error}</div>}

        {/* Add Account Section */}
        <div className="transaction-form-section">
          <h2>Add Account</h2>
          <form onSubmit={handleCreate} className="transaction-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input className="form-input" name="name" value={formData.name} onChange={handleCreateChange} placeholder="e.g. Chase" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-input" name="type" value={formData.type} onChange={handleCreateChange}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Initial Balance</label>
                <input className="form-input" name="balance" type="number" step="0.01" value={formData.balance} onChange={handleCreateChange} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input className="form-input" name="currency" value={formData.currency} onChange={handleCreateChange} placeholder="USD" />
              </div>
            </div>
            <button type="submit" className="add-btn" disabled={submitting}>{submitting ? 'Saving...' : 'Create Account'}</button>
          </form>
        </div>

        <div className="transaction-list">
          <div className="tx-header">
            <h2 style={{ margin: 0 }}>Your Accounts</h2>
            <div style={{ fontWeight: 700 }}>Total: {totalBalance.toFixed(2)}</div>
          </div>

          {loading ? <p>Loading...</p> : (
            <React.Fragment>
              {/* 🖥️ 電腦版表格：套用 accounts-table-wrap */}
              <div className="accounts-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Type</th><th>Currency</th><th style={{ textAlign: 'right' }}>Balance</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((a) => {
                      const isEditing = editingId === a.id;
                      return (
                        <tr key={a.id} className={a.archived ? 'account-archived-row' : ''} onClick={() => navigate(`/account/${a.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            {isEditing ? (
                              <input className="form-input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} onClick={(e) => e.stopPropagation()} />
                            ) : (
                              <span>{a.name} {a.archived && <span className="archived-pill">Archived</span>}</span>
                            )}
                          </td>
                          <td>{isEditing ? <select className="form-input" value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))} onClick={(e) => e.stopPropagation()}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select> : accountTypeLabel(a.type)}</td>
                          <td>{isEditing ? <input className="form-input" value={editForm.currency} onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))} onClick={(e) => e.stopPropagation()} /> : a.currency}</td>
                          <td className="tx-amount">{Number(a.balance || 0).toFixed(2)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <button className="add-btn" onClick={saveEdit}>Save</button>
                            ) : (
                              <div style={{display: 'flex', gap: '5px'}}>
                                <button className="add-btn" onClick={() => startEdit(a)}>Edit</button>
                                <button className="add-btn" onClick={() => toggleArchive(a)}>{a.archived ? 'Unhide' : 'Hide'}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 手機版卡片：套用 accounts-cards */}
              <div className="accounts-cards">
                {sortedAccounts.map((a) => (
                  <div key={a.id} className={`account-card-mobile ${a.archived ? 'is-archived' : ''}`} onClick={() => navigate(`/account/${a.id}`)}>
                    <div className="account-card-mobile__top">
                      <div>
                        <div className="account-card-mobile__name">{a.name} {a.archived && <span className="archived-pill">Archived</span>}</div>
                        <div className="account-card-mobile__meta">{accountTypeLabel(a.type)} · {a.currency}</div>
                      </div>
                      <div className="account-card-mobile__balance">{Number(a.balance || 0).toFixed(2)}</div>
                    </div>
                    <div className="account-card-mobile__actions" onClick={(e) => e.stopPropagation()}>
                        <button className="add-btn" onClick={() => startEdit(a)}>Edit</button>
                        <button className="add-btn" onClick={() => toggleArchive(a)}>{a.archived ? 'Unhide' : 'Hide'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountsPage;