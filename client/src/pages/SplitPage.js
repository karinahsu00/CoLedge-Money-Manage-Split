import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const SplitPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [groups, setGroups] = useState([
        {
            id: 1,
            name: 'Apartment Rent',
            createdBy: 'you',
            members: ['You', 'Alice', 'Bob'],
            expenses: [
                { id: 1, date: '2026-01-15', amount: 3000, paidBy: 'You', description: 'Rent', splitWith: ['Alice', 'Bob'], splitAmounts: { 'You': 1000, 'Alice': 1000, 'Bob': 1000 } },
                { id: 2, date: '2026-01-10', amount: 150, paidBy: 'Alice', description: 'Groceries', splitWith: ['You', 'Bob'], splitAmounts: { 'Alice': 50, 'You': 50, 'Bob': 50 } }
            ],
            shareCode: 'APT123'
        }
    ]);

    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showShareLink, setShowShareLink] = useState(false);
    const [shareLink, setShareLink] = useState('');

    const [newGroupForm, setNewGroupForm] = useState({
        name: '',
        members: ''
    });

    const [newExpenseForm, setNewExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paidBy: 'You',
        description: '',
        splitWith: []
    });

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!newGroupForm.name || !newGroupForm.members) {
            alert('Please fill in all fields');
            return;
        }

        const members = newGroupForm.members.split(',').map(m => m.trim());
        members.unshift('You');

        const newGroup = {
            id: Math.max(...groups.map(g => g.id), 0) + 1,
            name: newGroupForm.name,
            createdBy: 'you',
            members: [...new Set(members)],
            expenses: [],
            shareCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        };

        setGroups([...groups, newGroup]);
        setNewGroupForm({ name: '', members: '' });
        setShowAddGroup(false);
        setSelectedGroupId(newGroup.id);
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!newExpenseForm.amount || !newExpenseForm.description || newExpenseForm.splitWith.length === 0) {
            alert('Please fill in all fields and select members to split with');
            return;
        }

        const splitMembers = newExpenseForm.splitWith;
        const amountPerPerson = parseFloat(newExpenseForm.amount) / splitMembers.length;

        const splitAmounts = {};
        splitMembers.forEach(member => {
            splitAmounts[member] = amountPerPerson;
        });

        const newExpense = {
            id: Math.max(...(selectedGroup.expenses.length > 0 ? selectedGroup.expenses.map(e => e.id) : [0])) + 1,
            date: newExpenseForm.date,
            amount: parseFloat(newExpenseForm.amount),
            paidBy: newExpenseForm.paidBy,
            description: newExpenseForm.description,
            splitWith: newExpenseForm.splitWith,
            splitAmounts: splitAmounts
        };

        setGroups(groups.map(g => {
            if (g.id === selectedGroupId) {
                return { ...g, expenses: [...g.expenses, newExpense] };
            }
            return g;
        }));

        setNewExpenseForm({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            paidBy: 'You',
            description: '',
            splitWith: []
        });
        setShowAddExpense(false);
    };

    const handleToggleSplitMember = (member) => {
        setNewExpenseForm(prev => ({
            ...prev,
            splitWith: prev.splitWith.includes(member)
                ? prev.splitWith.filter(m => m !== member)
                : [...prev.splitWith, member]
        }));
    };

    const handleJoinGroup = (e) => {
        e.preventDefault();
        const group = groups.find(g => g.shareCode === joinCode.toUpperCase());
        if (group) {
            if (!group.members.includes('You')) {
                setGroups(groups.map(g => {
                    if (g.id === group.id) {
                        return { ...g, members: [...g.members, 'You'] };
                    }
                    return g;
                }));
            }
            setJoinCode('');
            setShowJoinGroup(false);
            setSelectedGroupId(group.id);
            alert('Joined group successfully!');
        } else {
            alert('Invalid share code');
        }
    };

    const generateShareLink = (group) => {
        const link = `${window.location.origin}${window.location.pathname}?joinCode=${group.shareCode}`;
        setShareLink(link);
        setShowShareLink(true);
        
        // Copy to clipboard
        navigator.clipboard.writeText(link);
        alert('Share link copied to clipboard!');
    };

    const calculateBalance = (group, member) => {
        let paid = 0;
        let owes = 0;

        group.expenses.forEach(expense => {
            if (expense.paidBy === member) {
                paid += expense.amount;
            }
            if (expense.splitWith.includes(member)) {
                owes += expense.splitAmounts[member] || 0;
            }
        });

        return paid - owes;
    };

    const calculateSettlements = (group) => {
        const balances = {};
        group.members.forEach(member => {
            balances[member] = calculateBalance(group, member);
        });

        const settlements = [];
        const debtors = group.members.filter(m => balances[m] < 0);
        const creditors = group.members.filter(m => balances[m] > 0);

        debtors.forEach(debtor => {
            let debt = Math.abs(balances[debtor]);
            creditors.forEach(creditor => {
                if (debt > 0 && balances[creditor] > 0) {
                    const amount = Math.min(debt, balances[creditor]);
                    settlements.push({
                        from: debtor,
                        to: creditor,
                        amount: amount.toFixed(2)
                    });
                    debt -= amount;
                    balances[creditor] -= amount;
                }
            });
        });

        return settlements;
    };

    const handleDeleteExpense = (groupId, expenseId) => {
        setGroups(groups.map(g => {
            if (g.id === groupId) {
                return { ...g, expenses: g.expenses.filter(e => e.id !== expenseId) };
            }
            return g;
        }));
    };

    const handleDeleteGroup = (groupId) => {
        if (window.confirm('Are you sure you want to delete this group?')) {
            setGroups(groups.filter(g => g.id !== groupId));
            setSelectedGroupId(null);
            setShowAddExpense(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let sortedExpenses = selectedGroup ? [...selectedGroup.expenses].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }) : [];

    const settlements = selectedGroup ? calculateSettlements(selectedGroup) : [];

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
                    <button className="nav-btn active">Split</button>
                    <button className="nav-btn" onClick={() => navigate('/analytics')}>Analytics</button>
                    <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
                    {user && <span className="user-email">{user.email}</span>}
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

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                    {groups.map(group => (
                        <div key={group.id} style={{background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer', border: selectedGroupId === group.id ? '2px solid #667eea' : '1px solid #eee'}} onClick={() => setSelectedGroupId(group.id)}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px'}}>
                                <div>
                                    <h3 style={{margin: 0, color: '#333'}}>{group.name}</h3>
                                    <p style={{margin: '5px 0', fontSize: '12px', color: '#999'}}>Share Code: <strong>{group.shareCode}</strong></p>
                                </div>
                                {group.createdBy === 'you' && (
                                    <button className="delete-btn" onClick={(e) => {e.stopPropagation(); handleDeleteGroup(group.id);}}>Delete</button>
                                )}
                            </div>
                            <p style={{margin: '10px 0', color: '#666'}}>Members: {group.members.join(', ')}</p>
                            <p style={{margin: '10px 0', color: '#666'}}>Total Expenses: ${group.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</p>
                            <p style={{margin: '10px 0', fontSize: '12px', color: '#999'}}>Expenses: {group.expenses.length}</p>
                        </div>
                    ))}
                </div>

                {selectedGroup && (
                    <div style={{background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px'}}>
                            <h2 style={{margin: 0, flex: 1}}>{selectedGroup.name} - Group Ledger</h2>
                            <button className="add-btn" onClick={() => generateShareLink(selectedGroup)}>🔗 Share Link</button>
                            <button className="add-btn" onClick={() => setShowAddExpense(!showAddExpense)}>➕ Add Expense</button>
                        </div>

                        {showShareLink && (
                            <div style={{background: '#e7f5ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #74c0fc'}}>
                                <p style={{margin: '0 0 10px 0', fontWeight: 500}}>📋 Share Link (Copied to clipboard):</p>
                                <input type="text" value={shareLink} readOnly style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '12px'}} />
                            </div>
                        )}

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
                                            {selectedGroup.members.map(member => (
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
                                    <label>Split With (Select members to split)</label>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '10px'}}>
                                        {selectedGroup.members.map(member => (
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

                        <div style={{marginBottom: '30px'}}>
                            <h3 style={{marginBottom: '15px'}}>💳 Member Balances</h3>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px'}}>
                                {selectedGroup.members.map(member => {
                                    const balance = calculateBalance(selectedGroup, member);
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
                                    {sortedExpenses.length > 0 ? (
                                        sortedExpenses.map(expense => (
                                            <tr key={expense.id} style={{borderBottom: '1px solid #eee'}}>
                                                <td style={{padding: '12px'}}>{expense.date}</td>
                                                <td style={{padding: '12px'}}>{expense.description}</td>
                                                <td style={{padding: '12px', color: '#ff6b6b', fontWeight: 500}}>${expense.amount.toFixed(2)}</td>
                                                <td style={{padding: '12px'}}>{expense.paidBy}</td>
                                                <td style={{padding: '12px', fontSize: '12px'}}>{expense.splitWith.join(', ')}</td>
                                                <td style={{padding: '12px'}}>
                                                    <button className="delete-btn" onClick={() => handleDeleteExpense(selectedGroup.id, expense.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{padding: '20px', textAlign: 'center', color: '#999'}}>No expenses yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {groups.length === 0 && (
                    <div style={{background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#999'}}>
                        <p style={{fontSize: '16px'}}>No groups yet. Create one to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitPage;
