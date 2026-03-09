import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { transactionsAPI, accountsAPI } from '../services/api';
import '../pages/Dashboard.css';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [transactionType, setTransactionType] = useState('expense');
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [customCategories, setCustomCategories] = useState({
        expense: ['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Other'],
        income: ['Salary', 'Bonus', 'Interest', 'Other'],
        transfer: ['Internal Transfer']
    });

    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [sortOrder, setSortOrder] = useState('desc');
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        account: '',
        accountTo: '',
        member: 'You',
        type: 'expense',
        note: ''
    });

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Load accounts and transactions from backend on mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [accRes, txRes] = await Promise.all([
                    accountsAPI.getAll(),
                    transactionsAPI.getAll()
                ]);
                const loadedAccounts = accRes.data || [];
                setAccounts(loadedAccounts);
                setTransactions(txRes.data || []);
                if (loadedAccounts.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        account: loadedAccounts[0].name,
                        accountTo: loadedAccounts.length > 1 ? loadedAccounts[1].name : ''
                    }));
                }
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleTypeChange = (type) => {
        setTransactionType(type);
        setFormData(prev => ({...prev, type: type, category: ''}));
        setShowAddCategory(false);
    };

    const handleAddCategory = () => {
        if (newCategory.trim() && !customCategories[transactionType].includes(newCategory)) {
            setCustomCategories(prev => ({
                ...prev,
                [transactionType]: [...prev[transactionType], newCategory]
            }));
            setFormData(prev => ({...prev, category: newCategory}));
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

        const payload = {
            ...formData,
            amount: parseFloat(formData.amount)
        };

        try {
            const res = await transactionsAPI.create(payload);
            setTransactions(prev => [res.data, ...prev]);
            setFormData(prev => ({
                date: new Date().toISOString().split('T')[0],
                amount: '',
                category: '',
                account: accounts.length > 0 ? accounts[0].name : '',
                accountTo: accounts.length > 1 ? accounts[1].name : '',
                member: 'You',
                type: transactionType,
                note: ''
            }));
        } catch (err) {
            alert('Failed to add transaction: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await transactionsAPI.delete(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            alert('Failed to delete transaction: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleEditStart = (transaction) => {
        setEditingId(transaction.id);
        setEditFormData({
            date: transaction.date,
            amount: transaction.amount,
            category: transaction.category,
            account: transaction.account,
            accountTo: transaction.accountTo || '',
            member: transaction.member || 'You',
            type: transaction.type,
            note: transaction.note || ''
        });
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleEditSave = async (id) => {
        if (!editFormData.amount || !editFormData.category) {
            alert('Please fill in all fields');
            return;
        }
        const payload = {
            ...editFormData,
            amount: parseFloat(editFormData.amount)
        };
        try {
            const res = await transactionsAPI.update(id, payload);
            setTransactions(prev => prev.map(t => t.id === id ? res.data : t));
            setEditingId(null);
            setEditFormData({});
        } catch (err) {
            alert('Failed to update transaction: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let filteredTransactions = transactions.filter(t => t.type === transactionType);
    filteredTransactions = filteredTransactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const colSpan = transactionType === 'transfer' ? 8 : 7;

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
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                    <select name="account" value={formData.account} onChange={handleInputChange} className="form-input">
                                        {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
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
                                        {accounts.filter(acc => acc.name !== formData.account).map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                    <select name="category" value={formData.category} onChange={handleInputChange} className="form-input">
                                        <option value="">Select Category</option>
                                        {customCategories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <button type="button" className="add-category-btn" onClick={() => setShowAddCategory(!showAddCategory)}>➕</button>
                                </div>
                                {showAddCategory && (
                                    <div style={{marginTop: '10px', display: 'flex', gap: '10px'}}>
                                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter new category" className="form-input" />
                                        <button type="button" className="add-btn" onClick={handleAddCategory}>Add</button>
                                        <button type="button" className="cancel-btn" onClick={() => {setShowAddCategory(false); setNewCategory('');}}>Cancel</button>
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

                        <button type="submit" className="add-btn">Add Transaction</button>
                    </form>
                </div>

                <div className="transaction-tabs">
                    <button className={`tab ${transactionType === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>💸 Expense</button>
                    <button className={`tab ${transactionType === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>💰 Income</button>
                    <button className={`tab ${transactionType === 'transfer' ? 'active' : ''}`} onClick={() => handleTypeChange('transfer')}>🔄 Transfer</button>
                </div>

                <div className="transaction-list">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px'}}>
                        <h2 style={{margin: 0, flex: 1}}>
                            {transactionType === 'expense' && 'Expense List'}
                            {transactionType === 'income' && 'Income List'}
                            {transactionType === 'transfer' && 'Transfer List'}
                        </h2>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <label style={{fontWeight: 500, whiteSpace: 'nowrap'}}>Sort by Date:</label>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{padding: '8px 12px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', cursor: 'pointer'}}>
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>Loading transactions…</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    {transactionType === 'transfer' ? (<><th>From Account</th><th>To Account</th></>) : (<th>Account</th>)}
                                    <th>Member</th>
                                    <th>Note</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((transaction) => (
                                        editingId === transaction.id ? (
                                            /* ── Inline edit row ── */
                                            <tr key={transaction.id} style={{background: '#f0f4ff'}}>
                                                <td>
                                                    <input type="date" value={editFormData.date} onChange={e => setEditFormData(p => ({...p, date: e.target.value}))} className="form-input" style={{width: '130px'}} />
                                                </td>
                                                <td>
                                                    <input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData(p => ({...p, amount: e.target.value}))} className="form-input" style={{width: '100px'}} />
                                                </td>
                                                <td>
                                                    <select value={editFormData.category} onChange={e => setEditFormData(p => ({...p, category: e.target.value}))} className="form-input">
                                                        <option value="">Select</option>
                                                        {customCategories[editFormData.type] && customCategories[editFormData.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                        {editFormData.category && !customCategories[editFormData.type]?.includes(editFormData.category) && (
                                                            <option value={editFormData.category}>{editFormData.category}</option>
                                                        )}
                                                    </select>
                                                </td>
                                                {transactionType === 'transfer' ? (
                                                    <>
                                                        <td>
                                                            <select value={editFormData.account} onChange={e => setEditFormData(p => ({...p, account: e.target.value}))} className="form-input">
                                                                {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select value={editFormData.accountTo} onChange={e => setEditFormData(p => ({...p, accountTo: e.target.value}))} className="form-input">
                                                                <option value="">Select</option>
                                                                {accounts.filter(acc => acc.name !== editFormData.account).map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                                                            </select>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td>
                                                        <select value={editFormData.account} onChange={e => setEditFormData(p => ({...p, account: e.target.value}))} className="form-input">
                                                            {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                                                        </select>
                                                    </td>
                                                )}
                                                <td>
                                                    <input type="text" value={editFormData.member} onChange={e => setEditFormData(p => ({...p, member: e.target.value}))} className="form-input" style={{width: '90px'}} />
                                                </td>
                                                <td>
                                                    <input type="text" value={editFormData.note} onChange={e => setEditFormData(p => ({...p, note: e.target.value}))} className="form-input" style={{width: '100px'}} />
                                                </td>
                                                <td>
                                                    <button className="add-btn" style={{padding: '5px 10px', fontSize: '12px', marginRight: '5px'}} onClick={() => handleEditSave(transaction.id)}>Save</button>
                                                    <button className="cancel-btn" style={{padding: '5px 10px', fontSize: '12px'}} onClick={handleEditCancel}>Cancel</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            /* ── Normal display row ── */
                                            <tr key={transaction.id}>
                                                <td>{transaction.date}</td>
                                                <td className="amount">${parseFloat(transaction.amount).toFixed(2)}</td>
                                                <td>{transaction.category}</td>
                                                {transactionType === 'transfer' ? (<><td>{transaction.account}</td><td>{transaction.accountTo}</td></>) : (<td>{transaction.account}</td>)}
                                                <td>{transaction.member}</td>
                                                <td>{transaction.note}</td>
                                                <td>
                                                    <button className="edit-btn" onClick={() => handleEditStart(transaction)}>Edit</button>
                                                    <button className="delete-btn" onClick={() => handleDeleteTransaction(transaction.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        )
                                    ))
                                ) : (
                                    <tr><td colSpan={colSpan} style={{textAlign: 'center', padding: '20px'}}>No transaction records</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
