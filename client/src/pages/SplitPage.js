import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, splitsAPI } from '../services/api';
import '../pages/Dashboard.css';

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

    // Edit expense state
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editExpenseForm, setEditExpenseForm] = useState({});

    const [newGroupForm, setNewGroupForm] = useState({ name: '', members: '' });

    const [newExpenseForm, setNewExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paidBy: 'You',
        description: '',
        splitWith: []
    });

    const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

    // Load all groups from backend on mount
    useEffect(() => {
        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const res = await groupsAPI.getAll();
                setGroups(res.data || []);
            } catch (err) {
                console.error('Failed to load groups:', err);
            } finally {
                setLoadingGroups(false);
            }
        };
        fetchGroups();
    }, []);

    // Load splits for the selected group
    const loadSplitsForGroup = useCallback(async (groupId) => {
        setLoadingSplits(true);
        setSelectedGroupSplits([]);
        try {
            const res = await splitsAPI.getByGroup(groupId);
            setSelectedGroupSplits(res.data || []);
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
        // Default paidBy to first member
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
        // Prepend 'You' as the creator
        const members = ['You', ...memberList.filter(m => m !== 'You')];
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            const res = await groupsAPI.create({ name: newGroupForm.name, members, shareCode });
            const newGroup = res.data;
            setGroups(prev => [...prev, newGroup]);
            setNewGroupForm({ name: '', members: '' });
            setShowAddGroup(false);
            handleSelectGroup(newGroup.id);
        } catch (err) {
            alert('Failed to create group: ' + (err.response?.data?.error || err.message));
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
                setShowAddExpense(false);
                setEditingExpenseId(null);
            }
        } catch (err) {
            alert('Failed to delete group: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpenseForm.amount || !newExpenseForm.description || newExpenseForm.splitWith.length === 0) {
            alert('Please fill in all fields and select at least one member to split with');
            return;
        }
        const amount = parseFloat(newExpenseForm.amount);
        const splitMembers = newExpenseForm.splitWith;
        const amountPerPerson = amount / splitMembers.length;
        const splitAmounts = {};
        splitMembers.forEach(m => { splitAmounts[m] = amountPerPerson; });

        const payload = {
            groupId: selectedGroupId,
            totalAmount: amount,
            amount,
            paidBy: newExpenseForm.paidBy,
            description: newExpenseForm.description,
            date: newExpenseForm.date,
            splitWith: splitMembers,
            splitAmounts
        };

        try {
            const res = await splitsAPI.create(payload);
            setSelectedGroupSplits(prev => [res.data, ...prev]);
            setNewExpenseForm({
                date: new Date().toISOString().split('T')[0],
                amount: '',
                paidBy: selectedGroup?.members?.[0] || 'You',
                description: '',
                splitWith: []
            });
            setShowAddExpense(false);
        } catch (err) {
            alert('Failed to add expense: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await splitsAPI.delete(expenseId);
            setSelectedGroupSplits(prev => prev.filter(s => s.id !== expenseId));
        } catch (err) {
            alert('Failed to delete expense: ' + (err.response?.data?.error || err.message));
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

    const handleEditExpenseCancel = () => {
        setEditingExpenseId(null);
        setEditExpenseForm({});
    };

    const handleEditExpenseSave = async (expenseId) => {
        if (!editExpenseForm.amount || !editExpenseForm.description || editExpenseForm.splitWith.length === 0) {
            alert('Please fill in all fields and select at least one member');
            return;
        }
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
            setSelectedGroupSplits(prev => prev.map(s => s.id === expenseId ? res.data : s));
            setEditingExpenseId(null);
            setEditExpenseForm({});
        } catch (err) {
            alert('Failed to update expense: ' + (err.response?.data?.error || err.message));
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
        const allSelected = allMembers.every(m => editExpenseForm.splitWith.includes(m));
        setEditExpenseForm(prev => ({
            ...prev,
            splitWith: allSelected ? [] : [...allMembers]
        }));
    };

    const handleJoinGroup = (e) => {
        e.preventDefault();
        const group = groups.find(g => g.shareCode === joinCode.toUpperCase());
        if (group) {
            if (!group.members.includes('You')) {
                setGroups(groups.map(g => g.id === group.id ? { ...g, members: [...g.members, 'You'] } : g));
            }
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sortedExpenses = [...selectedGroupSplits].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const settlements = calculateSettlements();

    const isGroupCreator = (group) => {
        if (!currentUser) return false;
        return group.createdBy === currentUser.uid || group.createdBy === 'you';
    };

    const allMembersSelected = selectedGroup
        ? (selectedGroup.members || []).every(m => newExpenseForm.splitWith.includes(m))
        : false;

    const editAllMembersSelected = selectedGroup
        ? (selectedGroup.members || []).every(m => editExpenseForm.splitWith?.includes(m))
        : false;

    return (
        <div className="dashboard-container">
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
                <div className="dashboard-header">
                    <h1>👥 Split Expense</h1>
                </div>

                <div style={{display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap'}}>
                    <button className="add-btn" onClick={() => setShowAddGroup(!showAddGroup)}>➕ Create Group</button>
                    <button className="add-btn" onClick={() => setShowJoinGroup(!showJoinGroup)}>🔗 Join Group</button>
                </div>

                {showAddGroup && (
                    <form onSubmit={handleCreateGroup} style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                        <div className="form-group">
                            <label>Group Name</label>
                            <input
                                type="text"
                                value={newGroupForm.name}
                                onChange={(e) => setNewGroupForm({...newGroupForm, name: e.target.value})}
                                placeholder="e.g., Apartment Rent"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Members (comma separated, You will be added automatically)</label>
                            <input
                                type="text"
                                value={newGroupForm.members}
                                onChange={(e) => setNewGroupForm({...newGroupForm, members: e.target.value})}
                                placeholder="e.g., Alice, Bob, Charlie"
                                className="form-input"
                            />
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button type="submit" className="add-btn">Create Group</button>
                            <button type="button" className="cancel-btn" onClick={() => setShowAddGroup(false)}>Cancel</button>
                        </div>
                    </form>
                )}

                {showJoinGroup && (
                    <form onSubmit={handleJoinGroup} style={{background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                        <div className="form-group">
                            <label>Share Code</label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Enter share code"
                                className="form-input"
                            />
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button type="submit" className="add-btn">Join Group</button>
                            <button type="button" className="cancel-btn" onClick={() => setShowJoinGroup(false)}>Cancel</button>
                        </div>
                    </form>
                )}

                {loadingGroups ? (
                    <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>Loading groups…</p>
                ) : (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                        {groups.map(group => (
                            <div
                                key={group.id}
                                style={{background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer', border: selectedGroupId === group.id ? '2px solid #667eea' : '1px solid #eee'}}
                                onClick={() => handleSelectGroup(group.id)}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px'}}>
                                    <div>
                                        <h3 style={{margin: 0, color: '#333'}}>{group.name}</h3>
                                        {group.shareCode && (
                                            <p style={{margin: '5px 0', fontSize: '12px', color: '#999'}}>Share Code: <strong>{group.shareCode}</strong></p>
                                        )}
                                    </div>
                                    {isGroupCreator(group) && (
                                        <button className="delete-btn" onClick={(e) => {e.stopPropagation(); handleDeleteGroup(group.id);}}>Delete</button>
                                    )}
                                </div>
                                <p style={{margin: '10px 0', color: '#666'}}>Members: {(group.members || []).join(', ')}</p>
                            </div>
                        ))}
                    </div>
                )}

                {!loadingGroups && groups.length === 0 && (
                    <div style={{background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#999'}}>
                        <p style={{fontSize: '16px'}}>No groups yet. Create one to get started!</p>
                    </div>
                )}

                {selectedGroup && (
                    <div style={{background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px'}}>
                            <h2 style={{margin: 0, flex: 1}}>{selectedGroup.name} - Group Ledger</h2>
                            <button className="add-btn" onClick={() => generateShareLink(selectedGroup)}>🔗 Share Link</button>
                            <button className="add-btn" onClick={() => { setShowAddExpense(!showAddExpense); setEditingExpenseId(null); }}>➕ Add Expense</button>
                        </div>

                        {showShareLink && (
                            <div style={{background: '#e7f5ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #74c0fc'}}>
                                <p style={{margin: '0 0 10px 0', fontWeight: 500}}>📋 Share Link (Copied to clipboard):</p>
                                <input type="text" value={shareLink} readOnly style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '12px'}} />
                            </div>
                        )}

                        {/* ── Add Expense Form ── */}
                        {showAddExpense && (
                            <form onSubmit={handleAddExpense} style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input type="date" value={newExpenseForm.date} onChange={(e) => setNewExpenseForm({...newExpenseForm, date: e.target.value})} className="form-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Amount</label>
                                        <input type="number" step="0.01" value={newExpenseForm.amount} onChange={(e) => setNewExpenseForm({...newExpenseForm, amount: e.target.value})} placeholder="Enter amount" className="form-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Paid By</label>
                                        <select value={newExpenseForm.paidBy} onChange={(e) => setNewExpenseForm({...newExpenseForm, paidBy: e.target.value})} className="form-input">
                                            {(selectedGroup.members || []).map(member => (
                                                <option key={member} value={member}>{member}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <input type="text" value={newExpenseForm.description} onChange={(e) => setNewExpenseForm({...newExpenseForm, description: e.target.value})} placeholder="e.g., Groceries" className="form-input" />
                                </div>

                                <div className="form-group">
                                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px'}}>
                                        <label style={{margin: 0}}>Split With (Select members to split)</label>
                                        <button
                                            type="button"
                                            className={allMembersSelected ? 'delete-btn' : 'add-btn'}
                                            style={{padding: '5px 14px', fontSize: '13px'}}
                                            onClick={handleSelectAllMembers}
                                        >
                                            {allMembersSelected ? 'Deselect All' : 'All'}
                                        </button>
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px'}}>
                                        {(selectedGroup.members || []).map(member => (
                                            <label key={member} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'white', borderRadius: '5px', border: '1px solid #ddd', cursor: 'pointer'}}>
                                                <input
                                                    type="checkbox"
                                                    checked={newExpenseForm.splitWith.includes(member)}
                                                    onChange={() => handleToggleSplitMember(member)}
                                                />
                                                <span>{member}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                                    <button type="submit" className="add-btn">Add Expense</button>
                                    <button type="button" className="cancel-btn" onClick={() => setShowAddExpense(false)}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {/* ── Member Balances ── */}
                        <div style={{marginBottom: '30px'}}>
                            <h3 style={{marginBottom: '15px'}}>💳 Member Balances</h3>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px'}}>
                                {(selectedGroup.members || []).map(member => {
                                    const balance = calculateBalance(member);
                                    return (
                                        <div key={member} style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${balance > 0 ? '#51cf66' : balance < 0 ? '#ff6b6b' : '#999'}`}}>
                                            <p style={{margin: '0 0 10px 0', fontWeight: 500}}>{member}</p>
                                            <p style={{margin: 0, fontSize: '20px', fontWeight: 'bold', color: balance > 0 ? '#51cf66' : balance < 0 ? '#ff6b6b' : '#999'}}>
                                                {balance > 0 ? '+' : ''}{parseFloat(balance).toFixed(2)}
                                            </p>
                                            <p style={{margin: '5px 0 0 0', fontSize: '12px', color: '#666'}}>
                                                {balance > 0 ? 'to receive' : balance < 0 ? 'to pay' : 'settled'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Settlement Summary ── */}
                        {settlements.length > 0 && (
                            <div style={{marginBottom: '30px', background: '#fff3bf', padding: '20px', borderRadius: '8px', border: '1px solid #ffd666'}}>
                                <h3 style={{margin: '0 0 15px 0', color: '#7f3f00'}}>💰 Settlement Summary</h3>
                                <div style={{display: 'grid', gap: '10px'}}>
                                    {settlements.map((settlement, idx) => (
                                        <div key={idx} style={{background: 'white', padding: '12px', borderRadius: '5px', border: '1px solid #ffd666'}}>
                                            <p style={{margin: 0, fontWeight: 500}}>
                                                <span style={{color: '#ff6b6b'}}>{settlement.from}</span>
                                                {' pays $'}
                                                <span style={{color: '#ff6b6b', fontWeight: 'bold'}}>{settlement.amount}</span>
                                                {' to '}
                                                <span style={{color: '#51cf66'}}>{settlement.to}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Expenses Table ── */}
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                <h3 style={{margin: 0}}>Expenses</h3>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <label style={{fontWeight: 500}}>Sort by Date:</label>
                                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{padding: '8px 12px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', cursor: 'pointer'}}>
                                        <option value="desc">Newest First</option>
                                        <option value="asc">Oldest First</option>
                                    </select>
                                </div>
                            </div>

                            {loadingSplits ? (
                                <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>Loading expenses…</p>
                            ) : (
                                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                    <thead style={{background: '#f8f9fa'}}>
                                        <tr>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Date</th>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Description</th>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Amount</th>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Paid By</th>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Split Among</th>
                                            <th style={{padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd'}}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedExpenses.length > 0 ? sortedExpenses.map(expense => (
                                            editingExpenseId === expense.id ? (
                                                /* ── Inline edit row for expense ── */
                                                <tr key={expense.id} style={{background: '#f0f4ff', borderBottom: '1px solid #eee'}}>
                                                    <td style={{padding: '8px'}}>
                                                        <input type="date" value={editExpenseForm.date} onChange={e => setEditExpenseForm(p => ({...p, date: e.target.value}))} className="form-input" style={{width: '130px'}} />
                                                    </td>
                                                    <td style={{padding: '8px'}}>
                                                        <input type="text" value={editExpenseForm.description} onChange={e => setEditExpenseForm(p => ({...p, description: e.target.value}))} className="form-input" style={{width: '120px'}} />
                                                    </td>
                                                    <td style={{padding: '8px'}}>
                                                        <input type="number" step="0.01" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({...p, amount: e.target.value}))} className="form-input" style={{width: '90px'}} />
                                                    </td>
                                                    <td style={{padding: '8px'}}>
                                                        <select value={editExpenseForm.paidBy} onChange={e => setEditExpenseForm(p => ({...p, paidBy: e.target.value}))} className="form-input">
                                                            {(selectedGroup.members || []).map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{padding: '8px'}}>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                                                            <button
                                                                type="button"
                                                                className={editAllMembersSelected ? 'delete-btn' : 'add-btn'}
                                                                style={{padding: '3px 10px', fontSize: '12px'}}
                                                                onClick={handleEditSelectAllMembers}
                                                            >
                                                                {editAllMembersSelected ? 'Deselect All' : 'All'}
                                                            </button>
                                                        </div>
                                                        {(selectedGroup.members || []).map(m => (
                                                            <label key={m} style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', cursor: 'pointer'}}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(editExpenseForm.splitWith || []).includes(m)}
                                                                    onChange={() => handleEditToggleSplitMember(m)}
                                                                />
                                                                <span style={{fontSize: '12px'}}>{m}</span>
                                                            </label>
                                                        ))}
                                                    </td>
                                                    <td style={{padding: '8px'}}>
                                                        <button className="add-btn" style={{padding: '5px 10px', fontSize: '12px', marginRight: '5px', display: 'block', marginBottom: '5px'}} onClick={() => handleEditExpenseSave(expense.id)}>Save</button>
                                                        <button className="cancel-btn" style={{padding: '5px 10px', fontSize: '12px'}} onClick={handleEditExpenseCancel}>Cancel</button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* ── Normal display row ── */
                                                <tr key={expense.id} style={{borderBottom: '1px solid #eee'}}>
                                                    <td style={{padding: '12px'}}>{expense.date ? expense.date.split('T')[0] : ''}</td>
                                                    <td style={{padding: '12px'}}>{expense.description}</td>
                                                    <td style={{padding: '12px', color: '#ff6b6b', fontWeight: 500}}>${parseFloat(expense.totalAmount || expense.amount || 0).toFixed(2)}</td>
                                                    <td style={{padding: '12px'}}>{expense.paidBy}</td>
                                                    <td style={{padding: '12px', fontSize: '12px'}}>{(expense.splitWith || []).join(', ')}</td>
                                                    <td style={{padding: '12px'}}>
                                                        <button className="edit-btn" style={{marginRight: '5px'}} onClick={() => handleEditExpenseStart(expense)}>Edit</button>
                                                        <button className="delete-btn" onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            )
                                        )) : (
                                            <tr>
                                                <td colSpan="6" style={{padding: '20px', textAlign: 'center', color: '#999'}}>No expenses yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitPage;
