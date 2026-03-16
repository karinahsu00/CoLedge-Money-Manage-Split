import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI, fxAPI } from '../config/api';
import '../pages/Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** * 金額顯示：確保 USD 顯示的是「換算後」的數字，而非 1:1 */
const AmountDisplay = ({ t, accountById }) => {
  const amount = safeNum(t.amount, 0);
  const acc = accountById.get(t.accountId);
  const localCur = t.currency || acc?.currency || 'USD';
  
  // 核心邏輯：USD 價值必須是 (原幣 * 該交易存檔時的匯率)
  // 如果 t.usdAmount 存在就用它，否則用目前的匯率計算
  const rateToUSD = safeNum(t.fxRateToUSD || acc?.fxRateToUSD, 1);
  const usdVal = t.usdAmount != null ? safeNum(t.usdAmount) : (amount * rateToUSD);

  if (t.type === 'transfer') {
    const accTo = accountById.get(t.accountToId);
    const toAmt = safeNum(t.toAmount || t.amount);
    const toRate = safeNum(accTo?.fxRateToUSD, 1);
    return (
      <div style={{ textAlign: 'right', fontSize: '13px' }}>
        <div style={{ fontWeight: 600, color: '#2C4C3B' }}>
            {(amount * rateToUSD).toFixed(2)} USD <span style={{fontSize: '0.8em', color: '#888', fontWeight: 400}}>({amount.toFixed(2)} {localCur})</span>
        </div>
        <div style={{ color: '#888' }}>
          → {(toAmt * toRate).toFixed(2)} USD <span style={{fontSize: '0.8em'}}>( {toAmt.toFixed(2)} {accTo?.currency || 'USD'} )</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontWeight: 600 }}>{usdVal.toFixed(2)} USD</span>
      {localCur !== 'USD' && (
        <span style={{ color: '#888', fontSize: '0.85em', display: 'block' }}>
          ({amount.toFixed(2)} {localCur})
        </span>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [transactionType, setTransactionType] = useState('expense');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '', category: '', accountId: '', accountToId: '',
    member: 'You', type: 'expense', note: '', toAmount: '',
    fxRate: '', fxAuto: true,
  });

  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a?.id) m.set(a.id, a); });
    return m;
  }, [accounts]);

  const reloadAll = async () => {
    const [acct, tx] = await Promise.all([accountsAPI.getAll(), transactionsAPI.getAll()]);
    setAccounts(Array.isArray(acct) ? acct : []);
    setTransactions(Array.isArray(tx) ? tx : []);
  };

  useEffect(() => { reloadAll().then(() => setLoading(false)); }, []);

  // 轉帳自動換算邏輯
  useEffect(() => {
    const runFx = async () => {
      if (transactionType !== 'transfer' || !formData.fxAuto || !formData.amount || !formData.accountId || !formData.accountToId) return;
      try {
        const fromCur = accountById.get(formData.accountId)?.currency;
        const toCur = accountById.get(formData.accountToId)?.currency;
        const res = await fxAPI.getRate(fromCur, toCur);
        const rate = safeNum(res?.rate, 1);
        setFormData(prev => ({ ...prev, fxRate: rate, toAmount: (safeNum(prev.amount) * rate).toFixed(2) }));
      } catch (e) { console.error(e); }
    };
    runFx();
  }, [formData.amount, formData.accountId, formData.accountToId, transactionType, formData.fxAuto, accountById]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'toAmount') setFormData(prev => ({ ...prev, toAmount: value, fxAuto: false }));
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountId) return alert('Please fill in required fields');
    
    try {
      setSubmitting(true);
      const acc = accountById.get(formData.accountId);
      
      // 計算該筆交易應該存入的 USD 金額 (原幣 * 該帳戶對 USD 的匯率)
      const currentRateToUSD = safeNum(acc?.fxRateToUSD, 1);
      const calculatedUSD = Number(formData.amount) * currentRateToUSD;

      const payload = { 
        ...formData, 
        amount: Number(formData.amount), 
        usdAmount: calculatedUSD, // 顯式存入換算後的美金值
        type: transactionType,
        category: transactionType === 'transfer' ? 'Internal Transfer' : formData.category,
        currency: acc?.currency || 'USD',
        fxRateToUSD: currentRateToUSD, // 紀錄當時匯率
        createdAt: new Date().toISOString() 
      };
      
      await transactionsAPI.create(payload);
      await reloadAll();
      setFormData(p => ({ ...p, amount: '', note: '', category: '', toAmount: '', fxAuto: true }));
    } catch (e) { alert('Failed to save'); } finally { setSubmitting(false); }
  };

  const filteredTransactions = useMemo(() => {
    return (Array.isArray(transactions) ? transactions : [])
      .filter(t => t.type === transactionType)
      .sort((a, b) => sortOrder === 'desc' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date));
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
              <div className="form-group"><label>Date</label><input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" /></div>
              <div className="form-group"><label>Amount ({accountById.get(formData.accountId)?.currency || 'USD'})</label><input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} className="form-input" /></div>
              <div className="form-group">
                <label>{transactionType === 'transfer' ? 'From Account' : 'Account'}</label>
                <select name="accountId" value={formData.accountId} onChange={handleInputChange} className="form-input">
                    <option value="">Select Account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
                </select>
              </div>
            </div>

            {transactionType === 'transfer' && (
              <div className="form-row">
                <div className="form-group">
                  <label>To Account</label>
                  <select name="accountToId" value={formData.accountToId} onChange={handleInputChange} className="form-input">
                    <option value="">Select</option>
                    {accounts.filter(acc => acc.id !== formData.accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>To Amount ({accountById.get(formData.accountToId)?.currency || 'USD'})</label>
                  <input type="number" step="0.01" name="toAmount" value={formData.toAmount} onChange={handleInputChange} className="form-input" />
                  <div style={{fontSize: '11px', color: '#888', marginTop: '4px'}}>
                    Rate: 1 {accountById.get(formData.accountId)?.currency} = {formData.fxRate || '—'} {accountById.get(formData.accountToId)?.currency}
                    {!formData.fxAuto && <span onClick={() => setFormData(p => ({...p, fxAuto: true}))} style={{marginLeft: '10px', color: '#2C4C3B', cursor: 'pointer', textDecoration: 'underline'}}>Reset Auto</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="form-row">
              {transactionType !== 'transfer' && (
                <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="form-input">
                        <option value="">Select Category</option>
                        {['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Salary', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
              )}
              <div className="form-group"><label>Note</label><input type="text" name="note" value={formData.note} onChange={handleInputChange} className="form-input" /></div>
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
          </div>
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead><tr><th>Date</th><th>Category</th><th>Account</th><th>Note</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{textAlign: 'right'}}>Actions</th></tr></thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td><td>{t.category}</td>
                    <td>{t.type === 'transfer' ? `${accountById.get(t.accountId)?.name} → ${accountById.get(t.accountToId)?.name}` : accountById.get(t.accountId)?.name}</td>
                    <td>{t.note}</td>
                    <td><AmountDisplay t={t} accountById={accountById} /></td>
                    <td style={{textAlign: 'right'}}>
                        <button className="delete-btn" onClick={() => transactionsAPI.delete(t.id).then(reloadAll)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default DashboardPage;