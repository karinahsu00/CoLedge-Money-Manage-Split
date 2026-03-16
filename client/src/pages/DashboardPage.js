import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI, fxAPI } from '../config/api';
import '../pages/Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const EMPTY_EDIT = {
  date: '', type: 'expense', category: '', accountId: '', accountToId: '',
  member: 'You', note: '', amount: '', toAmount: '', fxRate: '',
  fromCurrency: '', toCurrency: '', fxAuto: true,
};

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** * 修正後的金額顯示組件：強制從帳戶抓取原幣資訊
 */
const AmountDisplay = ({ t, accountById }) => {
  const amount = safeNum(t.amount, 0);
  const acc = accountById.get(t.accountId);
  
  // 優先級：交易紀錄幣別 > 帳戶原幣 > 預設 USD
  const localCurrency = t.currency || t.fromCurrency || acc?.currency || 'USD';
  
  // 取得 USD 等值
  let usdAmt = null;
  if (t.usdAmount != null) usdAmt = safeNum(t.usdAmount);
  else if (t.fxRateToUSD != null) usdAmt = amount * safeNum(t.fxRateToUSD);
  else if (acc?.fxRateToUSD != null && localCurrency !== 'USD') usdAmt = amount * safeNum(acc.fxRateToUSD);
  else if (localCurrency === 'USD') usdAmt = amount;

  // 轉帳邏輯
  if (t.type === 'transfer') {
    return (
      <div style={{ textAlign: 'right', fontSize: '13px' }}>
        <div style={{ fontWeight: 600, color: '#2C4C3B' }}>
          {safeNum(t.fromAmount || t.amount).toFixed(2)} {t.fromCurrency || 'USD'}
        </div>
        <div style={{ color: '#888' }}>
          → {safeNum(t.toAmount || t.amount).toFixed(2)} {t.toCurrency || 'USD'}
        </div>
      </div>
    );
  }

  // 強制顯示：只要原幣不是 USD，就必須顯示 ( 原幣金額 )
  if (localCurrency !== 'USD') {
    // 這裡我們預設存入的 amount 就是原幣金額
    // 如果資料庫顯示 usdAmt，我們就反推或直接顯示
    const displayUSD = usdAmt !== null ? usdAmt.toFixed(2) : (amount * (acc?.fxRateToUSD || 1)).toFixed(2);
    
    return (
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: 600 }}>{displayUSD} USD</span>
        <span style={{ color: '#888', fontSize: '0.85em', display: 'block' }}>
          ( {amount.toFixed(2)} {localCurrency} )
        </span>
      </div>
    );
  }

  return <div style={{ textAlign: 'right', fontWeight: 600 }}>{amount.toFixed(2)} USD</div>;
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
    amount: '', category: '', accountId: '', accountToId: '',
    member: 'You', type: 'expense', note: '', toAmount: '',
    fxRate: '', fromCurrency: '', toCurrency: '', fxAuto: true,
  });

  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a?.id) m.set(a.id, a); });
    return m;
  }, [accounts]);

  const accountNameById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a?.id) m.set(a.id, a.name); });
    return m;
  }, [accounts]);

  const reloadAll = async () => {
    try {
      const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);
      setAccounts(Array.isArray(acct) ? acct : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    reloadAll().then(() => setLoading(false));
  }, []);

  // 當選擇帳戶時，自動更新輸入框的幣別提示
  const selectedAccCurrency = useMemo(() => {
    return accountById.get(formData.accountId)?.currency || 'USD';
  }, [formData.accountId, accountById]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.accountId) return alert('Please fill in required fields');
    
    try {
      setSubmitting(true);
      const acc = accountById.get(formData.accountId);
      
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        currency: acc?.currency || 'USD',
        fxRateToUSD: acc?.fxRateToUSD || null,
        createdAt: new Date().toISOString()
      };
      
      await transactionsAPI.create(payload);
      await reloadAll();
      setFormData(p => ({ ...p, amount: '', note: '', category: '' }));
    } catch (e) { setError('Failed to add transaction'); } finally { setSubmitting(false); }
  };

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? [...transactions] : [];
    list = list.filter((t) => t.type === transactionType);
    return list.sort((a, b) => sortOrder === 'desc' 
      ? new Date(b.date) - new Date(a.date) 
      : new Date(a.date) - new Date(b.date));
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
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header"><h1>📝 Record Transaction</h1></div>

        <div className="transaction-form-section">
          <h2>Add New {transactionType}</h2>
          <form onSubmit={handleAddTransaction} className="transaction-form">
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" />
              </div>
              <div className="form-group">
                <label>Amount ({selectedAccCurrency})</label>
                <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} className="form-input" placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Account</label>
                <select name="accountId" value={formData.accountId} onChange={handleInputChange} className="form-input">
                  <option value="">Select Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="form-input">
                  <option value="">Select Category</option>
                  {customCategories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Note</label>
                <input type="text" name="note" value={formData.note} onChange={handleInputChange} className="form-input" placeholder="Optional" />
              </div>
            </div>
            <button type="submit" className="add-btn" disabled={submitting}>Add Transaction</button>
          </form>
        </div>

        <div className="transaction-tabs">
          <button className={`tab ${transactionType === 'expense' ? 'active' : ''}`} onClick={() => setTransactionType('expense')}>💸 Expense</button>
          <button className={`tab ${transactionType === 'income' ? 'active' : ''}`} onClick={() => setTransactionType('income')}>💰 Income</button>
          <button className={`tab ${transactionType === 'transfer' ? 'active' : ''}`} onClick={() => setTransactionType('transfer')}>🔄 Transfer</button>
        </div>

        <div className="transaction-list">
          <div className="tx-header">
            <h2>Recent Transactions</h2>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest</option><option value="asc">Oldest</option>
            </select>
          </div>

          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr><th>Date</th><th>Category</th><th>Account</th><th>Note</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td><td>{t.category}</td>
                    <td>{t.type === 'transfer' ? `${accountNameById.get(t.accountId)} → ${accountNameById.get(t.accountToId)}` : accountNameById.get(t.accountId)}</td>
                    <td>{t.note}</td>
                    <td><AmountDisplay t={t} accountById={accountById} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tx-cards">
            {filteredTransactions.map(t => (
              <div key={t.id} className="tx-card" style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 600 }}>{t.category}</span>
                  <AmountDisplay t={t} accountById={accountById} />
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {t.date} • {accountNameById.get(t.accountId)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default DashboardPage;