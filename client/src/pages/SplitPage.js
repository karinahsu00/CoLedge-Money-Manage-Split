import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, splitsAPI, fxAPI } from '../config/api';
import '../pages/Dashboard.css';
import MobileTabBar from '../components/MobileTabBar';

const SplitPage = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [selectedGroupSplits, setSelectedGroupSplits] = useState([]);
    const [loadingSplits, setLoadingSplits] = useState(false);

    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showShareLink, setShowShareLink] = useState(false);
    const [shareLink, setShareLink] = useState('');

    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editExpenseForm, setEditExpenseForm] = useState({});
    const [newGroupForm, setNewGroupForm] = useState({ name: '', members: '' });

    const [newExpenseForm, setNewExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'USD',
        category: '',
        paidBy: 'You',
        description: '',
        splitWith: []
    });

    const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

    useEffect(() => {
        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const res = await groupsAPI.getAll();
                setGroups(res || []);
            } catch (err) {
                console.error('Failed to load groups:', err);
            } finally {
                setLoadingGroups(false);
            }
        };
        fetchGroups();
    }, []);

    const loadSplitsForGroup = useCallback(async (groupId) => {
        setLoadingSplits(true);
        setSelectedGroupSplits([]);
        try {
            const res = await splitsAPI.getByGroupId(groupId);
            setSelectedGroupSplits(res || []);
        } catch (err) {
            console.error('Failed to load splits:', err);
        } finally {
            setLoadingSplits(false);
        }
    }, []);

    const handleSelectGroup = (groupId) => {
        setSelectedGroupId(groupId);
        setShowAddExpense(false);
        setEditingExpenseId(null);
        setShowShareLink(false);
        loadSplitsForGroup(groupId);
        const grp = groups.find(g => g.id === groupId);
        if (grp && grp.members && grp.members.length > 0) {
            setNewExpenseForm(prev => ({ ...prev, paidBy: grp.members[0], splitWith: [] }));
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupForm.name || !newGroupForm.members) {
            alert('Please fill in all fields');
            return;
        }
        const memberList = newGroupForm.members.split(',').map(m => m.trim()).filter(Boolean);
        const members = ['You', ...memberList.filter(m => m !== 'You')];
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            const res = await groupsAPI.create({ name: newGroupForm.name, members, shareCode });
            setGroups(prev => [...prev, res]);
            setNewGroupForm({ name: '', members: '' });
            setShowAddGroup(false);
            handleSelectGroup(res.id);
        } catch (err) {
            alert('Failed to create group: ' + err.message);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;
        try {
            await groupsAPI.delete(groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            if (selectedGroupId === groupId) {
                setSelectedGroupId(null);
                setSelectedGroupSplits([]);
            }
        } catch (err) {
            alert('Failed to delete group: ' + err.message);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpenseForm.amount || !newExpenseForm.description || newExpenseForm.splitWith.length === 0) {
            alert('Please fill in amount, description and at least one member to split with.');
            return;
        }
        const amount      = parseFloat(newExpenseForm.amount);
        const currency    = (newExpenseForm.currency || 'USD').toUpperCase().trim();
        const splitMembers     = newExpenseForm.splitWith;
        const amountPerPerson  = amount / splitMembers.length;
        const splitAmounts     = {};
        splitMembers.forEach(m => { splitAmounts[m] = amountPerPerson; });

        // FX: resolve usdAmount — currency → USD
        let usdAmount = amount; // fallback: 1:1
        try {
            if (currency !== 'USD') {
                const fxRes = await fxAPI.getRate(currency, 'USD');
                usdAmount = amount * (fxRes?.rate || 1);
            }
        } catch (fxErr) {
            console.warn('FX lookup failed, storing 1:1:', fxErr.message);
        }

        const payload = {
            groupId:     selectedGroupId,
            totalAmount: amount,
            amount,
            usdAmount,
            currency,
            category:    newExpenseForm.category || 'Other',
            paidBy:      newExpenseForm.paidBy,
            description: newExpenseForm.description,
            date:        newExpenseForm.date,
            splitWith:   splitMembers,
            splitAmounts,
        };

        try {
            const res = await splitsAPI.create(payload);
            setSelectedGroupSplits(prev => [res, ...prev]);
            setNewExpenseForm({
                date: new Date().toISOString().split('T')[0],
                amount: '',
                currency: 'USD',
                category: '',
                paidBy: selectedGroup?.members?.[0] || 'You',
                description: '',
                splitWith: []
            });
            setShowAddExpense(false);
        } catch (err) {
            alert('Failed to add expense: ' + err.message);
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await splitsAPI.delete(expenseId);
            setSelectedGroupSplits(prev => prev.filter(s => s.id !== expenseId));
        } catch (err) {
            alert('Failed to delete expense: ' + err.message);
        }
    };

    const handleEditExpenseStart = (expense) => {
        setEditingExpenseId(expense.id);
        setEditExpenseForm({
            date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
            amount: expense.totalAmount || expense.amount || '',
            paidBy: expense.paidBy || '',
            description: expense.description || '',
            splitWith: expense.splitWith ? [...expense.splitWith] : []
        });
    };

    const handleEditExpenseSave = async (expenseId) => {
        const amount = parseFloat(editExpenseForm.amount);
        const splitMembers = editExpenseForm.splitWith;
        const amountPerPerson = amount / splitMembers.length;
        const splitAmounts = {};
        splitMembers.forEach(m => { splitAmounts[m] = amountPerPerson; });

        const payload = {
            totalAmount: amount,
            amount,
            paidBy: editExpenseForm.paidBy,
            description: editExpenseForm.description,
            date: editExpenseForm.date,
            splitWith: splitMembers,
            splitAmounts
        };

        try {
            const res = await splitsAPI.update(expenseId, payload);
            setSelectedGroupSplits(prev => prev.map(s => s.id === expenseId ? res : s));
            setEditingExpenseId(null);
        } catch (err) {
            alert('Failed to update expense: ' + err.message);
        }
    };

    const handleToggleSplitMember = (member) => {
        setNewExpenseForm(prev => ({
            ...prev,
            splitWith: prev.splitWith.includes(member)
                ? prev.splitWith.filter(m => m !== member)
                : [...prev.splitWith, member]
        }));
    };

    const handleSelectAllMembers = () => {
        if (!selectedGroup) return;
        const allMembers = selectedGroup.members || [];
        const allSelected = allMembers.every(m => newExpenseForm.splitWith.includes(m));
        setNewExpenseForm(prev => ({
            ...prev,
            splitWith: allSelected ? [] : [...allMembers]
        }));
    };

    const handleEditToggleSplitMember = (member) => {
        setEditExpenseForm(prev => ({
            ...prev,
            splitWith: prev.splitWith.includes(member)
                ? prev.splitWith.filter(m => m !== member)
                : [...prev.splitWith, member]
        }));
    };

    const handleEditSelectAllMembers = () => {
        if (!selectedGroup) return;
        const allMembers = selectedGroup.members || [];
        const allSelected = (editExpenseForm.splitWith || []).length === allMembers.length;
        setEditExpenseForm(prev => ({
            ...prev,
            splitWith: allSelected ? [] : [...allMembers]
        }));
    };

    const handleJoinGroup = (e) => {
        e.preventDefault();
        const group = groups.find(g => g.shareCode === joinCode.toUpperCase());
        if (group) {
            setJoinCode('');
            setShowJoinGroup(false);
            handleSelectGroup(group.id);
            alert('Joined group successfully!');
        } else {
            alert('Invalid share code');
        }
    };

    const generateShareLink = (group) => {
        const link = `${window.location.origin}${window.location.pathname}?joinCode=${group.shareCode}`;
        setShareLink(link);
        setShowShareLink(true);
        navigator.clipboard.writeText(link);
        alert('Share link copied to clipboard!');
    };

    const calculateBalance = (member) => {
        let paid = 0;
        let owes = 0;
        selectedGroupSplits.forEach(split => {
            const amount = parseFloat(split.totalAmount || split.amount || 0);
            if (split.paidBy === member) paid += amount;
            if (split.splitWith && split.splitWith.includes(member)) {
                owes += parseFloat(split.splitAmounts?.[member] || 0);
            }
        });
        return paid - owes;
    };

    const calculateSettlements = () => {
        if (!selectedGroup) return [];
        const balances = {};
        selectedGroup.members.forEach(member => { balances[member] = calculateBalance(member); });
        const settlements = [];
        const debtors = selectedGroup.members.filter(m => balances[m] < 0);
        const creditors = selectedGroup.members.filter(m => balances[m] > 0);
        debtors.forEach(debtor => {
            let debt = Math.abs(balances[debtor]);
            creditors.forEach(creditor => {
                if (debt > 0 && balances[creditor] > 0) {
                    const amount = Math.min(debt, balances[creditor]);
                    settlements.push({ from: debtor, to: creditor, amount: amount.toFixed(2) });
                    debt -= amount;
                    balances[creditor] -= amount;
                }
            });
        });
        return settlements;
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const sortedExpenses = [...selectedGroupSplits].sort((a, b) => {
        const dateA = new Date(a.date); const dateB = new Date(b.date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const settlements = calculateSettlements();
    const isGroupCreator = (group) => currentUser && (group.createdBy === currentUser.uid || group.createdBy === 'you');
    const allMembersSelected = selectedGroup && (selectedGroup.members || []).every(m => newExpenseForm.splitWith.includes(m));
    const editAllMembersSelected = selectedGroup && (selectedGroup.members || []).every(m => editExpenseForm.splitWith?.includes(m));

    return (
        <div className="dashboard-container">
            {/* Desktop Navbar - Hidden on Mobile via CSS */}
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
                    <button className="nav-btn active">Split</button>
                    <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
                    <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
                    {currentUser && <span className="user-email">{currentUser.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header"><h1>👥 Split Expense</h1></div>

                <div style={{display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap'}}>
                    <button className="add-btn" onClick={() => setShowAddGroup(!showAddGroup)}>➕ Create Group</button>
                    <button className="add-btn" onClick={() => setShowJoinGroup(!showJoinGroup)}>🔗 Join Group</button>
                </div>

                {/* Create/Join Forms here... (keep original) */}
                {showAddGroup && (
                    <form onSubmit={handleCreateGroup} style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                        <div className="form-group">
                            <label>Group Name</label>
                            <input type="text" value={newGroupForm.name} onChange={(e) => setNewGroupForm({...newGroupForm, name: e.target.value})} placeholder="e.g., Apartment Rent" className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Members (comma separated)</label>
                            <input type="text" value={newGroupForm.members} onChange={(e) => setNewGroupForm({...newGroupForm, members: e.target.value})} placeholder="e.g., Alice, Bob" className="form-input" />
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button type="submit" className="add-btn">Create</button>
                            <button type="button" className="cancel-btn" onClick={() => setShowAddGroup(false)}>Cancel</button>
                        </div>
                    </form>
                )}

                {showJoinGroup && (
                    <form onSubmit={handleJoinGroup} style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                        <div className="form-group"><label>Share Code</label><input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="form-input" /></div>
                        <div style={{display: 'flex', gap: '10px'}}><button type="submit" className="add-btn">Join</button></div>
                    </form>
                )}

                {loadingGroups ? <p>Loading...</p> : (
                    <div className="groups-container" style={{marginBottom: '30px'}}>
                        {groups.map(group => (
                            <div key={group.id} className="group-card-clickable" style={{background: 'white', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: selectedGroupId === group.id ? '2px solid #2C4C3B' : '1px solid #eee', marginBottom: '10px'}} onClick={() => handleSelectGroup(group.id)}>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <h3>{group.name}</h3>
                                    {isGroupCreator(group) && <button className="delete-btn" onClick={(e) => {e.stopPropagation(); handleDeleteGroup(group.id);}}>Delete</button>}
                                </div>
                                <p>Members: {(group.members || []).join(', ')}</p>
                            </div>
                        ))}
                    </div>
                )}

                {selectedGroup && (
                    <div className="group-ledger-section" style={{background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
                            <h2>{selectedGroup.name} Ledger</h2>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button className="add-btn" onClick={() => generateShareLink(selectedGroup)}>🔗 Share</button>
                                <button className="add-btn" onClick={() => setShowAddExpense(!showAddExpense)}>➕ Add Expense</button>
                            </div>
                        </div>

                        {/* ── Add Expense Form ── */}
                        {showAddExpense && (
                            <div style={{background: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '20px'}}>
                                <h3 style={{marginBottom: '16px', color: '#2C4C3B'}}>➕ New Expense</h3>
                                <form onSubmit={handleAddExpense}>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px'}}>
                                        {/* Date */}
                                        <div className="form-group">
                                            <label>Date</label>
                                            <input type="date" className="form-input"
                                                value={newExpenseForm.date}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, date: e.target.value})} />
                                        </div>
                                        {/* Description */}
                                        <div className="form-group">
                                            <label>Description *</label>
                                            <input type="text" className="form-input" placeholder="e.g. Dinner"
                                                value={newExpenseForm.description}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, description: e.target.value})} />
                                        </div>
                                        {/* Category */}
                                        <div className="form-group">
                                            <label>Category</label>
                                            <select className="form-input"
                                                value={newExpenseForm.category}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, category: e.target.value})}>
                                                <option value="">Select</option>
                                                {['Food', 'Accommodation', 'Transportation', 'Shopping', 'Entertainment', 'Utilities', 'Other'].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Amount */}
                                        <div className="form-group">
                                            <label>Total Amount *</label>
                                            <input type="number" step="0.01" className="form-input" placeholder="0.00"
                                                value={newExpenseForm.amount}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, amount: e.target.value})} />
                                        </div>
                                        {/* Currency */}
                                        <div className="form-group">
                                            <label>Currency</label>
                                            <input type="text" className="form-input" placeholder="USD, NTD, JPY…" maxLength={5}
                                                value={newExpenseForm.currency}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, currency: e.target.value.toUpperCase()})} />
                                        </div>
                                        {/* Paid By */}
                                        <div className="form-group">
                                            <label>Paid By</label>
                                            <select className="form-input"
                                                value={newExpenseForm.paidBy}
                                                onChange={e => setNewExpenseForm({...newExpenseForm, paidBy: e.target.value})}>
                                                {(selectedGroup?.members || []).map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Split With checkboxes */}
                                    <div className="form-group" style={{marginBottom: '16px'}}>
                                        <label style={{marginBottom: '8px', display: 'block'}}>Split With *</label>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center'}}>
                                            <button type="button"
                                                onClick={handleSelectAllMembers}
                                                style={{padding: '4px 12px', borderRadius: '20px', border: '1px solid #2C4C3B', background: allMembersSelected ? '#2C4C3B' : 'white', color: allMembersSelected ? 'white' : '#2C4C3B', cursor: 'pointer', fontSize: '12px'}}>
                                                {allMembersSelected ? '✓ All' : 'Select All'}
                                            </button>
                                            {(selectedGroup?.members || []).map(m => {
                                                const checked = newExpenseForm.splitWith.includes(m);
                                                return (
                                                    <button key={m} type="button"
                                                        onClick={() => handleToggleSplitMember(m)}
                                                        style={{padding: '4px 14px', borderRadius: '20px', border: '1px solid #2C4C3B', background: checked ? '#2C4C3B' : 'white', color: checked ? 'white' : '#2C4C3B', cursor: 'pointer', fontSize: '13px'}}>
                                                        {checked ? `✓ ${m}` : m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {newExpenseForm.splitWith.length > 0 && (
                                            <div style={{marginTop: '8px', fontSize: '12px', color: '#888'}}>
                                                Each pays: {newExpenseForm.currency} {newExpenseForm.amount
                                                    ? (parseFloat(newExpenseForm.amount) / newExpenseForm.splitWith.length).toFixed(2)
                                                    : '—'}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{display: 'flex', gap: '10px'}}>
                                        <button type="submit" className="add-btn">Save Expense</button>
                                        <button type="button" className="nav-btn"
                                            onClick={() => setShowAddExpense(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ── Settlement Summary ── */}
                        {settlements.length > 0 && (
                            <div style={{marginBottom: '30px', background: '#fff3bf', padding: '15px', borderRadius: '8px'}}>
                                <h3>💰 Settlements</h3>
                                {settlements.map((s, idx) => <p key={idx}><b>{s.from}</b> pays <b>${s.amount}</b> to <b>{s.to}</b></p>)}
                            </div>
                        )}

                        {/* ── Expenses Section (Responsive Part) ── */}
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                <h3>Expenses</h3>
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="form-input" style={{width: 'auto'}}>
                                    <option value="desc">Newest</option><option value="asc">Oldest</option>
                                </select>
                            </div>

                            {/* 🖥️ 電腦版表格：只在寬螢幕顯示 */}
                            <div className="split-table-desktop">
                                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                    <thead style={{background: '#f8f9fa'}}>
                                        <tr>
                                            <th>Date</th><th>Desc</th><th>Amount</th><th>PaidBy</th><th>SplitWith</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedExpenses.map(expense => (
                                            <tr key={expense.id} style={{borderBottom: '1px solid #eee'}}>
                                                <td>{expense.date?.split('T')[0]}</td>
                                                <td>{expense.description}</td>
                                                <td style={{color: '#ff6b6b', whiteSpace: 'nowrap'}}>
                                                    {(() => {
                                                        const usd = parseFloat(expense.usdAmount || expense.totalAmount || expense.amount || 0);
                                                        const local = parseFloat(expense.totalAmount || expense.amount || 0);
                                                        const cur = expense.currency || 'USD';
                                                        return cur !== 'USD'
                                                            ? <>{usd.toFixed(2)} USD<br/><span style={{fontSize:'11px',color:'#aaa'}}>{local.toFixed(2)} {cur}</span></>
                                                            : <>{usd.toFixed(2)} USD</>;
                                                    })()}
                                                </td>
                                                <td>{expense.paidBy}</td>
                                                <td style={{fontSize: '11px'}}>{expense.splitWith?.join(', ')}</td>
                                                <td>
                                                    <button className="edit-btn" onClick={() => handleEditExpenseStart(expense)}>Edit</button>
                                                    <button className="delete-btn" onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 📱 手機版卡片：只在窄螢幕顯示 */}
                            <div className="split-cards-mobile">
                                {sortedExpenses.map(expense => (
                                    <div key={expense.id} className="split-card-mobile-item" style={{border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '10px'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                                            <span>{expense.description}</span>
                                            <span style={{color: '#ff6b6b', textAlign: 'right'}}>
                                                {(() => {
                                                    const usd = parseFloat(expense.usdAmount || expense.totalAmount || expense.amount || 0);
                                                    const local = parseFloat(expense.totalAmount || expense.amount || 0);
                                                    const cur = expense.currency || 'USD';
                                                    return cur !== 'USD'
                                                        ? <>{usd.toFixed(2)} USD<br/><span style={{fontSize:'11px',color:'#aaa'}}>{local.toFixed(2)} {cur}</span></>
                                                        : <>{usd.toFixed(2)} USD</>;
                                                })()}
                                            </span>
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                                            <div>📅 {expense.date?.split('T')[0]}</div>
                                            <div>👤 Paid by: {expense.paidBy}</div>
                                            <div style={{marginTop: '4px'}}>👥 Split: {expense.splitWith?.join(', ')}</div>
                                        </div>
                                        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                                            <button className="edit-btn" style={{flex: 1}} onClick={() => handleEditExpenseStart(expense)}>Edit</button>
                                            <button className="delete-btn" style={{flex: 1}} onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <MobileTabBar />
        </div>
    );
};

export default SplitPage;