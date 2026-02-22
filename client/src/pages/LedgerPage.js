import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const LedgerPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [ledgers, setLedgers] = useState([]);
    const [error, setError] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchLedgers();
    }, []);

    const fetchLedgers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:5002/api/ledgers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch ledgers');
            }

            const data = await response.json();
            setLedgers(data);
        } catch (err) {
            setError('Failed to fetch ledgers: ' + err.message);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        
        if (!amount || !description) {
            setError('Please fill in all fields');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:5002/api/ledgers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date,
                    amount: parseFloat(amount),
                    description
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add entry');
            }

            setAmount('');
            setDescription('');
            fetchLedgers();
        } catch (err) {
            setError('Failed to add entry: ' + err.message);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn active">Dashboard</button>
                    <button className="nav-btn" onClick={() => navigate('/transactions')}>Transactions</button>
                    <button className="nav-btn" onClick={() => navigate('/split')}>Split Expense</button>
                    <span className="user-email">{user?.email}</span>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>📊 Dashboard</h1>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="ledger-entry-form">
                    <h2>Add New Ledger Entry</h2>
                    <form onSubmit={handleAddEntry}>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="form-input"
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="form-input"
                        />
                        <input
                            type="text"
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input"
                        />
                        <button type="submit" className="add-btn">Add Entry</button>
                    </form>
                </div>

                <div className="ledger-table">
                    <table>
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>DESCRIPTION</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgers.length > 0 ? (
                                ledgers.map((ledger) => (
                                    <tr key={ledger.id}>
                                        <td>{ledger.date}</td>
                                        <td>${ledger.amount.toFixed(2)}</td>
                                        <td>{ledger.description}</td>
                                        <td>
                                            <button className="edit-btn">Edit</button>
                                            <button className="delete-btn">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>
                                        No ledger entries yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LedgerPage;
