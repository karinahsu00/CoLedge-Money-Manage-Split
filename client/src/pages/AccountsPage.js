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
      return (a?.name || '').toLowerCase().localeCompare((b?.name || '').toLowerCase());
    });
  }, [accounts]);

  // 計算所有帳戶折合 USD 的總額 (假設 API 有提供 fxRateToUSD)
  const totalBalanceUSD = useMemo(() => {
    return (accounts || []).reduce((sum, a) => {
      const bal = Number(a?.balance || 0);
      const rate = Number(a?.fxRateToUSD || 1);
      return sum + (a.currency === 'USD' ? bal : bal * rate);
    }, 0);
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
      await accountsAPI.create({
        ...formData,
        balance: Number(formData.balance || 0),
        initialBalance: Number(formData.balance || 0),
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

  const saveEdit = async () => {
    if (!editForm.name.trim()) return alert('Name is required');
    try {
      setSubmitting(true);
      await accountsAPI.update(editingId, editForm);
      setEditingId('');
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
      await accountsAPI.update(acc.id, { archived: !acc.archived });
      await loadAccounts();
    } catch (e) {
      setError('Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  /** * 輔助組件：渲染帳戶金額 (包含 USD 換算)
   */
  const AccountBalance = ({ a }) => {
  const bal = Number(a.balance || 0);
  const rate = Number(a.fxRateToUSD || 1);
  const usdEquiv = (a.currency === 'USD' ? bal : bal * rate).toFixed(2);

  return (
    <div style={{ textAlign: 'right' }}>
      {/* 這裡是美金大字 */}
      <div style={{ fontWeight: 700, fontSize: '1.1em', color: '#2C4C3B' }}>{usdEquiv} USD</div>
      {/* 這裡是原幣小字 */}
      {a.currency !== 'USD' && (
        <div style={{ fontSize: '0.85em', color: '#888', marginTop: '2px' }}>
          {bal.toFixed(2)} {a.currency}
        </div>
      )}
    </div>
  );
};

  return (
    <div className="dashboard-container accounts-page">
      <nav className="navbar">
        <div className="navbar-brand">🏦 CoLedge</div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
          <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
          <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
          <button className="nav-btn active">Accounts</button>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>🏷️ Accounts</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Add Account Section */}
        <div className="transaction-form-section">
          <h2>Add Account</h2>
          <form onSubmit={handleCreate} className="transaction-form">
            <div className="form-row">
              <div className="form-group"><label>Name</label><input className="form-input" name="name" value={formData.name} onChange={handleCreateChange} placeholder="e.g. Chase" /></div>
              <div className="form-group"><label>Type</label><select className="form-input" name="type" value={formData.type} onChange={handleCreateChange}>{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div className="form-group"><label>Balance</label><input className="form-input" name="balance" type="number" step="0.01" value={formData.balance} onChange={handleCreateChange} /></div>
              <div className="form-group"><label>Currency</label><input className="form-input" name="currency" value={formData.currency} onChange={handleCreateChange} placeholder="USD" /></div>
            </div>
            <button type="submit" className="add-btn" disabled={submitting}>Create Account</button>
          </form>
        </div>

        <div className="transaction-list">
          <div className="tx-header">
            <h2>Your Accounts</h2>
            <div style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Total: {totalBalanceUSD.toFixed(2)} USD</div>
          </div>

          {loading ? <p>Loading...</p> : (
            <>
              {/* 🖥️ 電腦版表格 */}
              <div className="accounts-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr><th>Name</th><th>Type</th><th>Currency</th><th style={{ textAlign: 'right' }}>Balance</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((a) => (
                      <tr key={a.id} className={a.archived ? 'account-archived-row' : ''} onClick={() => navigate(`/account/${a.id}`)} style={{ cursor: 'pointer' }}>
                        <td>{editingId === a.id ? <input className="form-input" value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} onClick={e => e.stopPropagation()} /> : <span>{a.name} {a.archived && <span className="archived-pill">Hidden</span>}</span>}</td>
                        <td>{accountTypeLabel(a.type)}</td>
                        <td>{a.currency}</td>
                        <td><AccountBalance a={a} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="edit-btn" onClick={() => startEdit(a)}>Edit</button>
                            <button className="delete-btn" onClick={() => toggleArchive(a)}>{a.archived ? 'Unhide' : 'Hide'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 📱 手機版卡片 - 強化視覺效果 */}
              <div className="accounts-cards">
                {sortedAccounts.map((a) => (
                  <div 
                    key={a.id} 
                    className={`account-card-mobile ${a.archived ? 'is-archived' : ''}`}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #eee'
                    }}
                    onClick={() => navigate(`/account/${a.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C4C3B' }}>
                          {a.name}
                          {a.archived && <span className="archived-pill" style={{ fontSize: '10px', marginLeft: '5px' }}>Hidden</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          {accountTypeLabel(a.type)} · {a.currency}
                        </div>
                      </div>
                      <AccountBalance a={a} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }} onClick={e => e.stopPropagation()}>
                      <button className="edit-btn" style={{ flex: 1, padding: '8px' }} onClick={() => startEdit(a)}>Edit</button>
                      <button className="delete-btn" style={{ flex: 1, padding: '8px' }} onClick={() => toggleArchive(a)}>{a.archived ? 'Show' : 'Hide'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AccountsPage;