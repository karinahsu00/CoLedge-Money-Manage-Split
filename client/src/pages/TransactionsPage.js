import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { transactionsAPI, accountsAPI } from '../config/api';
import './Dashboard.css';

const DEFAULT_CATEGORIES = {
    expense: ['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Other'],
    income: ['Salary', 'Bonus', 'Interest', 'Other'],
    transfer: ['Internal Transfer'],
};

const EMPTY_EDIT = {
    date: '',
    type: 'expense',
    category: '',
    accountId: '',
    accountToId: '',
    member: 'You',
    note: '',
    amount: '',
};

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit modal state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT);
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await transactionsAPI.getAll();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Failed to fetch transactions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
        accountsAPI.getAll()
            .then(data => setAccounts(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to load accounts', err));
    }, [fetchTransactions]);

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction? Note: account balances will NOT be adjusted. To keep balances accurate, consider manually correcting them in the Accounts page.')) return;
        try {
            await transactionsAPI.delete(id);
            fetchTransactions();
        } catch (err) {
            setError('Failed to delete transaction');
            console.error(err);
        }
    };

    const openEdit = (transaction) => {
        setEditingId(transaction.id);
        setEditForm({
            date: transaction.date || '',
            type: transaction.type || 'expense',
            category: transaction.category || '',
            accountId: transaction.accountId || '',
            accountToId: transaction.accountToId || '',
            member: transaction.member || 'You',
            note: transaction.note || transaction.description || '',
            amount: transaction.amount != null ? String(transaction.amount) : '',
        });
        setEditError('');
    };

    const closeEdit = () => {
        setEditingId(null);
        setEditForm(EMPTY_EDIT);
        setEditError('');
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => {
            const updated = { ...prev, [field]: value };
            // Clear accountToId when switching away from transfer
            if (field === 'type' && value !== 'transfer') {
                updated.accountToId = '';
            }
            return updated;
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setEditError('');

        // Validation
        if (!editForm.accountId) {
            setEditError('Account is required.');
            return;
        }
        if (editForm.type === 'transfer' && !editForm.accountToId) {
            setEditError('Destination account is required for transfers.');
            return;
        }
        if (editForm.type === 'transfer' && editForm.accountId === editForm.accountToId) {
            setEditError('Source and destination accounts must be different.');
            return;
        }
        const amount = parseFloat(editForm.amount);
        if (!editForm.amount || isNaN(amount) || amount <= 0) {
            setEditError('Amount must be a positive number.');
            return;
        }
        if (!editForm.date) {
            setEditError('Date is required.');
            return;
        }

        setSaving(true);
        try {
            await transactionsAPI.update(editingId, {
                date: editForm.date,
                type: editForm.type,
                category: editForm.category,
                accountId: editForm.accountId,
                accountToId: editForm.type === 'transfer' ? editForm.accountToId : '',
                member: editForm.member,
                note: editForm.note,
                description: editForm.note,
                amount,
            });
            closeEdit();
            fetchTransactions();
        } catch (err) {
            setEditError(err.message || 'Failed to update transaction');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const accountNameById = useMemo(() => {
        const map = {};
        accounts.forEach(a => { if (a?.id) map[a.id] = a.name; });
        return map;
    }, [accounts]);

    const categories = DEFAULT_CATEGORIES[editForm.type] || DEFAULT_CATEGORIES.expense;

    // Sort newest first
    const sortedTransactions = [...transactions].sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
    });

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <div className="dashboard-content">
                    <div className="dashboard-header">
                        <h1>📊 Transactions</h1>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <p style={{ color: 'var(--color-text-muted, #656D4A)', fontSize: 13, marginBottom: 16 }}>
                        ℹ️ Editing a transaction automatically adjusts account balances on the server. Deleting a transaction does <strong>not</strong> adjust balances.
                    </p>

                    {loading ? (
                        <p>Loading transactions...</p>
                    ) : (
                        <div className="transaction-list">
                            <div className="list-header">
                                <h2>All Transactions</h2>
                            </div>
                            <div className="tx-table-wrap">
                                <table className="tx-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Category</th>
                                            <th>Account</th>
                                            <th>To Account</th>
                                            <th>Member</th>
                                            <th>Note</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTransactions.length > 0 ? (
                                            sortedTransactions.map((t) => (
                                                <tr key={t.id}>
                                                    <td className="tx-nowrap">{t.date}</td>
                                                    <td className="tx-nowrap">{t.type}</td>
                                                    <td>{t.category}</td>
                                                    <td>{accountNameById[t.accountId] || t.accountId || '—'}</td>
                                                    <td>{t.accountToId ? (accountNameById[t.accountToId] || t.accountToId) : '—'}</td>
                                                    <td>{t.member || '—'}</td>
                                                    <td>{t.note || t.description || '—'}</td>
                                                    <td className="tx-amount">
                                                        <span className={t.type === 'expense' ? 'amount-out' : 'amount-in'}>
                                                            {Number(t.amount || 0).toFixed(2)} {t.currency || 'USD'}
                                                        </span>
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() => openEdit(t)}
                                                            style={{ marginRight: 6 }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => handleDeleteTransaction(t.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center' }}>No transactions yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Edit Modal ── */}
            {editingId && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 200,
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
                >
                    <div
                        style={{
                            background: 'var(--color-surface, #fff)',
                            borderRadius: 12,
                            padding: '28px 32px',
                            width: '100%',
                            maxWidth: 520,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                    >
                        <h2 style={{ marginBottom: 20, color: 'var(--color-text, #283618)' }}>
                            ✏️ Edit Transaction
                        </h2>

                        {editError && (
                            <div className="error-message" style={{ marginBottom: 16 }}>{editError}</div>
                        )}

                        <form onSubmit={handleSaveEdit} className="transaction-form">
                            {/* Date */}
                            <div className="form-group">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.date}
                                    onChange={e => handleEditChange('date', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Type */}
                            <div className="form-group">
                                <label>Type *</label>
                                <div className="transaction-tabs" style={{ marginBottom: 0 }}>
                                    {['expense', 'income', 'transfer'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`tab${editForm.type === t ? ' active' : ''}`}
                                            onClick={() => handleEditChange('type', t)}
                                        >
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    className="form-input"
                                    value={editForm.category}
                                    onChange={e => handleEditChange('category', e.target.value)}
                                >
                                    <option value="">— Select Category —</option>
                                    {categories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    {editForm.category && !categories.includes(editForm.category) && (
                                        <option value={editForm.category}>{editForm.category}</option>
                                    )}
                                </select>
                            </div>

                            {/* From Account */}
                            <div className="form-group">
                                <label>
                                    {editForm.type === 'transfer' ? 'From Account *' : 'Account *'}
                                </label>
                                <select
                                    className="form-input"
                                    value={editForm.accountId}
                                    onChange={e => handleEditChange('accountId', e.target.value)}
                                    required
                                >
                                    <option value="">— Select Account —</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* To Account (only for transfer) */}
                            {editForm.type === 'transfer' && (
                                <div className="form-group">
                                    <label>To Account *</label>
                                    <select
                                        className="form-input"
                                        value={editForm.accountToId}
                                        onChange={e => handleEditChange('accountToId', e.target.value)}
                                        required
                                    >
                                        <option value="">— Select Destination —</option>
                                        {accounts
                                            .filter(a => a.id !== editForm.accountId)
                                            .map(a => (
                                                <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* Amount */}
                            <div className="form-group">
                                <label>Amount *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editForm.amount}
                                    onChange={e => handleEditChange('amount', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    required
                                />
                            </div>

                            {/* Member */}
                            <div className="form-group">
                                <label>Member</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.member}
                                    onChange={e => handleEditChange('member', e.target.value)}
                                />
                            </div>

                            {/* Note */}
                            <div className="form-group">
                                <label>Note</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.note}
                                    onChange={e => handleEditChange('note', e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button
                                    type="submit"
                                    className="add-btn"
                                    disabled={saving}
                                    style={{ flex: 1 }}
                                >
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    style={{
                                        flex: 1,
                                        padding: '10px 20px',
                                        borderRadius: 6,
                                        border: '1px solid var(--color-border, #D6CCC2)',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: 15,
                                        color: 'var(--color-text, #283618)',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransactionsPage;
