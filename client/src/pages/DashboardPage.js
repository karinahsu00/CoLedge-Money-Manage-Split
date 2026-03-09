import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../config/api';
import '../pages/Dashboard.css';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [transactionType, setTransactionType] = useState('expense');
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [apiError, setApiError] = useState('');

    const [customCategories] = useState({
        expense: ['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Home', 'Health', 'Other'],
        income: ['Salary', 'Bonus', 'Interest', 'Other'],
        transfer: ['Internal Transfer']
    });

    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [extraCategories, setExtraCategories] = useState({ expense: [], income: [], transfer: [] });
    const [sortOrder, setSortOrder] = useState('desc');

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        account: '',
        accountTo: '',
        members: '',
        note: ''
    });

    // Load accounts and transactions from API on mount
    useEffect(() => {
        (async () => {
            try {
                const accs = await accountsAPI.getAll();
                if (Array.isArray(accs) && accs.length > 0) {
                    setAccounts(accs);
                    setFormData(prev => ({ ...prev, account: accs[0].name || accs[0].id }));
                }
            } catch (err) {
                // accounts api failed – continue with empty list
            }
            try {
                const txs = await transactionsAPI.getAll();
                setTransactions(Array.isArray(txs) ? txs : []);
            } catch (err) {
                // transactions api failed – continue with empty list
            }
        })();
    }, []);

    const allCategories = (type) => [...customCategories[type], ...extraCategories[type]];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (type) => {
        setTransactionType(type);
        setFormData(prev => ({ ...prev, category: '' }));
        setShowAddCategory(false);
    };

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !allCategories(transactionType).includes(trimmed)) {
            setExtraCategories(prev => ({
                ...prev,
                [transactionType]: [...prev[transactionType], trimmed]
            }));
            setFormData(prev => ({ ...prev, category: trimmed }));
            setNewCategory('');
            setShowAddCategory(false);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) {
            alert('Please fill in all fields');
            return;
        }
        setApiError('');

        // Parse members: comma-separated string → array
        const membersArray = formData.members
            ? formData.members.split(',').map(m => m.trim()).filter(Boolean)
            : [];

        const payload = {
            date: formData.date,
            amount: parseFloat(formData.amount),
            type: transactionType,
            category: transactionType === 'expense' ? formData.category : undefined,
            account: formData.account,
            accountTo: transactionType === 'transfer' ? formData.accountTo : undefined,
            members: membersArray,
            note: formData.note,
        };

        try {
            const created = await transactionsAPI.create(payload);
            setTransactions(prev => [created, ...prev]);
            setFormData(prev => ({
                ...prev,
                amount: '',
                category: '',
                members: '',
                note: ''
            }));
        } catch (err) {
            // Fall back to local state so the UI still responds
            const local = { ...payload, id: Date.now().toString(36) + Math.random().toString(36).slice(2) };
            setTransactions(prev => [local, ...prev]);
            setApiError('Saved locally (API error: ' + err.message + ')');
        }
    };

    const handleDeleteTransaction = async (id) => {
        try {
            await transactionsAPI.delete(id);
        } catch (err) {
            // ignore – delete from local state anyway
        }
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    let filteredTransactions = transactions.filter(t => t.type === transactionType);
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn active">Record</button>
                    <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
                    <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
                    <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
                    {user && <span className="user-email">{user.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>📝 Record Transaction</h1>
                </div>

                {apiError && <div className="error-message">{apiError}</div>}

                <div className="transaction-form-section">
                    <h2>Add New Transaction</h2>
                    <form onSubmit={handleAddTransaction} className="transaction-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Amount</label>
                                <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Enter amount" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>From Account</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <select name="account" value={formData.account} onChange={handleInputChange} className="form-input">
                                        {accounts.length === 0 && <option value="">No accounts</option>}
                                        {accounts.map(acc => (
                                            <option key={acc.id || acc.name} value={acc.name || acc.id}>
                                                {acc.name}
                                            </option>
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
                                    <select name="accountTo" value={formData.accountTo} onChange={handleInputChange} className="form-input">
                                        <option value="">Select account</option>
                                        {accounts.filter(acc => (acc.name || acc.id) !== formData.account).map(acc => (
                                            <option key={acc.id || acc.name} value={acc.name || acc.id}>
                                                {acc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            {transactionType !== 'transfer' && (
                                <div className="form-group">
                                    <label>Category</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <select name="category" value={formData.category} onChange={handleInputChange} className="form-input">
                                            <option value="">Select Category</option>
                                            {allCategories(transactionType).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="add-category-btn" onClick={() => setShowAddCategory(!showAddCategory)}>➕</button>
                                    </div>
                                    {showAddCategory && (
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter new category" className="form-input" />
                                            <button type="button" className="add-btn" onClick={handleAddCategory}>Add</button>
                                            <button type="button" className="cancel-btn" onClick={() => { setShowAddCategory(false); setNewCategory(''); }}>Cancel</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Members</label>
                                <input type="text" name="members" value={formData.members} onChange={handleInputChange} placeholder="e.g. Alice, Bob" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Note</label>
                                <input type="text" name="note" value={formData.note} onChange={handleInputChange} placeholder="Enter note" className="form-input" />
                            </div>
                        </div>

                        <button type="submit" className="add-btn">Add Transaction</button>
                    </form>
                </div>

                <div className="transaction-tabs">
                    <button className={`tab ${transactionType === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>💸 Expense</button>
                    <button className={`tab ${transactionType === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>💰 Income</button>
                    <button className={`tab ${transactionType === 'transfer' ? 'active' : ''}`} onClick={() => handleTypeChange('transfer')}>🔄 Transfer</button>
                </div>

                <div className="transaction-list">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                        <h2 style={{ margin: 0, flex: 1 }}>
                            {transactionType === 'expense' && 'Expense List'}
                            {transactionType === 'income' && 'Income List'}
                            {transactionType === 'transfer' && 'Transfer List'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Sort by Date:</label>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', cursor: 'pointer' }}>
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Category</th>
                                {transactionType === 'transfer' ? (<><th>From Account</th><th>To Account</th></>) : (<th>Account</th>)}
                                <th>Members</th>
                                <th>Note</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>{transaction.date ? transaction.date.split('T')[0] : ''}</td>
                                        <td className="amount">${parseFloat(transaction.amount || 0).toFixed(2)}</td>
                                        <td>{transaction.category || '—'}</td>
                                        {transactionType === 'transfer'
                                            ? (<><td>{transaction.account}</td><td>{transaction.accountTo}</td></>)
                                            : (<td>{transaction.account}</td>)
                                        }
                                        <td>{Array.isArray(transaction.members) ? transaction.members.join(', ') : (transaction.members || '—')}</td>
                                        <td>{transaction.note || transaction.description || '—'}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => handleDeleteTransaction(transaction.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={transactionType === 'transfer' ? '8' : '7'} style={{ textAlign: 'center', padding: '20px' }}>No transaction records</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
