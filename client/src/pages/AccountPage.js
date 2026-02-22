import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const AccountPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([
        { id: 1, name: 'Cash', balance: 500, color: '#FFD700' },
        { id: 2, name: 'Credit Card', balance: 5000, color: '#4169E1' },
        { id: 3, name: 'Bank Account', balance: 10000, color: '#32CD32' }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        balance: '',
        color: '#FFD700'
    });

    const colors = ['#FFD700', '#4169E1', '#32CD32', '#FF6B6B', '#9370DB', '#FF8C00'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddAccount = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.balance) {
            alert('Please fill in all fields');
            return;
        }

        if (editingId) {
            setAccounts(accounts.map(acc => 
                acc.id === editingId 
                    ? { ...acc, name: formData.name, balance: parseFloat(formData.balance), color: formData.color }
                    : acc
            ));
            setEditingId(null);
        } else {
            const newAccount = {
                id: Math.max(...accounts.map(a => a.id), 0) + 1,
                name: formData.name,
                balance: parseFloat(formData.balance),
                color: formData.color
            };
            setAccounts([...accounts, newAccount]);
        }

        setFormData({ name: '', balance: '', color: '#FFD700' });
        setShowAddForm(false);
    };

    const handleEditAccount = (account) => {
        setFormData({
            name: account.name,
            balance: account.balance.toString(),
            color: account.color
        });
        setEditingId(account.id);
        setShowAddForm(true);
    };

    const handleDeleteAccount = (id) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            setAccounts(accounts.filter(acc => acc.id !== id));
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
                    <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
                    <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
                    <button className="nav-btn active">Accounts</button>
                    {user && <span className="user-email">{user.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>💳 Account Management</h1>
                </div>

                <div className="total-balance-card">
                    <h3>Total Balance</h3>
                    <p className="total-amount">${totalBalance.toFixed(2)}</p>
                </div>

                <div className="action-buttons">
                    <button 
                        className="add-btn"
                        onClick={() => {
                            setShowAddForm(!showAddForm);
                            setEditingId(null);
                            setFormData({ name: '', balance: '', color: '#FFD700' });
                        }}
                    >
                        ➕ {editingId ? 'Edit Account' : 'Add Account'}
                    </button>
                </div>

                {showAddForm && (
                    <form onSubmit={handleAddAccount} className="add-account-form">
                        <div className="form-group">
                            <label>Account Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., Cash, Credit Card"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Balance</label>
                            <input
                                type="number"
                                step="0.01"
                                name="balance"
                                value={formData.balance}
                                onChange={handleInputChange}
                                placeholder="Enter balance"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Color</label>
                            <div className="color-picker">
                                {colors.map(color => (
                                    <div
                                        key={color}
                                        className={`color-option ${formData.color === color ? 'selected' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    ></div>
                                ))}
                            </div>
                        </div>
                        <div className="button-group">
                            <button type="submit" className="add-btn">
                                {editingId ? 'Update Account' : 'Add Account'}
                            </button>
                            <button 
                                type="button" 
                                className="cancel-btn"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingId(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <div className="accounts-grid">
                    {accounts.map(account => (
                        <div 
                            key={account.id} 
                            className="account-card"
                            style={{ borderLeftColor: account.color }}
                        >
                            <div className="account-header">
                                <h3>{account.name}</h3>
                                <div className="account-actions">
                                    <button 
                                        className="edit-btn"
                                        onClick={() => handleEditAccount(account)}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDeleteAccount(account.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <p className="account-balance">${account.balance.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
