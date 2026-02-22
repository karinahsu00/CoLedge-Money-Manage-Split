import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { transactionsAPI } from '../config/api';
import './Dashboard.css';

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newTransaction, setNewTransaction] = useState({ amount: '', description: '' });

    // Fetch transactions on mount
    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await transactionsAPI.getAll();
            setTransactions(data);
        } catch (err) {
            setError('Failed to fetch transactions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        
        if (!newTransaction.amount || !newTransaction.description) {
            setError('All fields are required');
            return;
        }

        try {
            await transactionsAPI.create({
                amount: parseFloat(newTransaction.amount),
                description: newTransaction.description
            });
            setNewTransaction({ amount: '', description: '' });
            fetchTransactions();
            setError('');
        } catch (err) {
            setError('Failed to add transaction');
            console.error(err);
        }
    };

    const handleDeleteTransaction = async (id) => {
        try {
            await transactionsAPI.delete(id);
            fetchTransactions();
        } catch (err) {
            setError('Failed to delete transaction');
            console.error(err);
        }
    };

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h1>📊 Transactions</h1>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="add-ledger-form">
                    <h2>Add New Transaction</h2>
                    <form onSubmit={handleAddTransaction}>
                        <input
                            type="number"
                            placeholder="Amount"
                            value={newTransaction.amount}
                            onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                            step="0.01"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Description"
                            value={newTransaction.description}
                            onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                            required
                        />
                        <button type="submit">Add Transaction</button>
                    </form>
                </div>

                {loading ? (
                    <p>Loading transactions...</p>
                ) : (
                    <table className="ledgers-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>{new Date(transaction.date).toLocaleDateString()}</td>
                                        <td>${transaction.amount.toFixed(2)}</td>
                                        <td>{transaction.description}</td>
                                        <td>
                                            <button 
                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                className="delete-btn"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4">No transactions yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default TransactionsPage;
