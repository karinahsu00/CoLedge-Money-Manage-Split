import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [transactionType, setTransactionType] = useState('expense');
    const [accounts] = useState([
        { id: 1, name: 'Cash', balance: 500, color: '#FFD700' },
        { id: 2, name: 'Credit Card', balance: 5000, color: '#4169E1' },
        { id: 3, name: 'Bank Account', balance: 10000, color: '#32CD32' }
    ]);

    const [transactions, setTransactions] = useState([
        { id: 1, date: '2026-01-15', amount: 150, category: 'Dining', account: 'Credit Card', accountTo: '', member: 'You', type: 'expense', note: 'Dinner out' },
        { id: 2, date: '2026-01-10', amount: 200, category: 'Utilities', account: 'Bank Account', accountTo: '', member: 'You', type: 'expense', note: 'Electricity bill' },
        { id: 3, date: '2026-01-20', amount: 5000, category: 'Salary', account: 'Bank Account', accountTo: '', member: 'You', type: 'income', note: 'Monthly salary' },
    ]);
    
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
        account: 'Cash',
        accountTo: 'Credit Card',
        member: 'You',
        type: 'expense',
        note: ''
    });

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

    const handleAddTransaction = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) {
            alert('Please fill in all fields');
            return;
        }

        const newTransaction = {
            id: transactions.length + 1,
            ...formData,
            amount: parseFloat(formData.amount)
        };

        setTransactions([newTransaction, ...transactions]);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            category: '',
            account: 'Cash',
            accountTo: 'Credit Card',
            member: 'You',
            type: transactionType,
            note: ''
        });
    };

    const handleDeleteTransaction = (id) => {
        setTransactions(transactions.filter(t => t.id !== id));
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
                                    <tr key={transaction.id}>
                                        <td>{transaction.date}</td>
                                        <td className="amount">${transaction.amount.toFixed(2)}</td>
                                        <td>{transaction.category}</td>
                                        {transactionType === 'transfer' ? (<><td>{transaction.account}</td><td>{transaction.accountTo}</td></>) : (<td>{transaction.account}</td>)}
                                        <td>{transaction.member}</td>
                                        <td>{transaction.note}</td>
                                        <td>
                                            <button className="edit-btn">Edit</button>
                                            <button className="delete-btn" onClick={() => handleDeleteTransaction(transaction.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={transactionType === 'transfer' ? '8' : '7'} style={{textAlign: 'center', padding: '20px'}}>No transaction records</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
