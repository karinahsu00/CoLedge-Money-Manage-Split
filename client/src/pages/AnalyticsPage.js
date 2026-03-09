import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { transactionsAPI } from '../config/api';
import '../pages/Dashboard.css';

// ── Pie chart colours ────────────────────────────────────────────────────────
const COLORS = [
    '#667eea', '#ff6b6b', '#51cf66', '#fcc419', '#74c0fc',
    '#f783ac', '#a9e34b', '#ff8787', '#63e6be', '#e599f7',
];

// ── SVG Pie chart ────────────────────────────────────────────────────────────
const PieChart = ({ data }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <p className="analytics-empty">No data</p>;

    const SIZE = 200;
    const R = 80;
    const CX = SIZE / 2;
    const CY = SIZE / 2;

    let cumulative = 0;
    const slices = data.map((d, i) => {
        const start = cumulative;
        cumulative += d.value / total;
        const end = cumulative;

        const startRad = start * 2 * Math.PI - Math.PI / 2;
        const endRad = end * 2 * Math.PI - Math.PI / 2;
        const largeArc = end - start > 0.5 ? 1 : 0;

        const x1 = CX + R * Math.cos(startRad);
        const y1 = CY + R * Math.sin(startRad);
        const x2 = CX + R * Math.cos(endRad);
        const y2 = CY + R * Math.sin(endRad);

        // Skip degenerate slice (100 %)
        if (data.length === 1) {
            return (
                <circle key={i} cx={CX} cy={CY} r={R} fill={COLORS[i % COLORS.length]} />
            );
        }

        return (
            <path
                key={i}
                d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={COLORS[i % COLORS.length]}
                stroke="white"
                strokeWidth="2"
            />
        );
    });

    return (
        <div className="pie-chart-wrap">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {slices}
            </svg>
            <ul className="pie-legend">
                {data.map((d, i) => (
                    <li key={i}>
                        <span className="pie-dot" style={{ background: COLORS[i % COLORS.length] }} />
                        {d.label} ({((d.value / total) * 100).toFixed(1)}%)
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ── Breakdown table ──────────────────────────────────────────────────────────
const BreakdownTable = ({ data, label }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <table className="analytics-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>{label}</th>
                    <th>Amount</th>
                    <th>Share</th>
                </tr>
            </thead>
            <tbody>
                {data.length === 0 ? (
                    <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                            No data for the selected period
                        </td>
                    </tr>
                ) : (
                    data.map((d, i) => (
                        <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{d.label || '(unknown)'}</td>
                            <td>${d.value.toFixed(2)}</td>
                            <td>{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function aggregate(transactions, keyFn) {
    const map = {};
    transactions.forEach(t => {
        const key = keyFn(t);
        if (!key) return;
        map[key] = (map[key] || 0) + (parseFloat(t.amount) || 0);
    });
    return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
}

function aggregateMembers(transactions) {
    const map = {};
    transactions.forEach(t => {
        const members = Array.isArray(t.members) ? t.members.filter(Boolean) : [];
        if (members.length === 0) return;
        const share = (parseFloat(t.amount) || 0) / members.length;
        members.forEach(m => { map[m] = (map[m] || 0) + share; });
    });
    return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
}

function filterByRange(transactions, rangeType, year, month, startDate, endDate) {
    return transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        if (isNaN(d)) return false;
        if (rangeType === 'month') {
            return d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(month);
        }
        if (rangeType === 'year') {
            return d.getFullYear() === parseInt(year);
        }
        if (rangeType === 'custom') {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate + 'T23:59:59') : null;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        }
        return true;
    });
}

// ── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const now = new Date();
    const [rangeType, setRangeType] = useState('month');
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load transactions once
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await transactionsAPI.getAll();
                setTransactions(Array.isArray(data) ? data : []);
            } catch (err) {
                setError('Failed to load transactions: ' + err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    // Filtered expense transactions
    const expenseTransactions = filterByRange(
        transactions.filter(t => t.type === 'expense'),
        rangeType, selectedYear, selectedMonth, startDate, endDate
    );

    const byCategory = aggregate(expenseTransactions, t => t.category);
    const byAccount = aggregate(expenseTransactions, t => t.account);
    const byMember = aggregateMembers(expenseTransactions);

    const totalExpense = expenseTransactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    // Year options
    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' },
        { value: 3, label: 'March' }, { value: 4, label: 'April' },
        { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' },
        { value: 9, label: 'September' }, { value: 10, label: 'October' },
        { value: 11, label: 'November' }, { value: 12, label: 'December' },
    ];

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Record</button>
                    <button className="nav-btn" onClick={() => navigate('/split')}>Split</button>
                    <button className="nav-btn active">Analytics</button>
                    <button className="nav-btn" onClick={() => navigate('/account')}>Accounts</button>
                    {user && <span className="user-email">{user.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>📈 Analytics</h1>
                </div>

                {/* ── Date Range Selector ── */}
                <div className="analytics-range-bar chart-container">
                    <div className="analytics-range-tabs">
                        {['month', 'year', 'custom'].map(rt => (
                            <button
                                key={rt}
                                className={`tab${rangeType === rt ? ' active' : ''}`}
                                onClick={() => setRangeType(rt)}
                            >
                                {rt === 'month' ? 'Month' : rt === 'year' ? 'Year' : 'Custom Range'}
                            </button>
                        ))}
                    </div>

                    <div className="analytics-range-inputs">
                        {rangeType === 'month' && (
                            <>
                                <select
                                    className="form-input"
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(e.target.value)}
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    className="form-input"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        {rangeType === 'year' && (
                            <select
                                className="form-input"
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                        {rangeType === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    placeholder="Start date"
                                />
                                <span className="analytics-date-sep">–</span>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    placeholder="End date"
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* ── Loading / Error ── */}
                {loading && <p className="analytics-empty">Loading…</p>}
                {error && <div className="error-message">{error}</div>}

                {!loading && !error && (
                    <>
                        {/* ── Summary ── */}
                        <div className="summary-cards">
                            <div className="summary-card expense">
                                <h3>Total Expenses</h3>
                                <p className="amount">${totalExpense.toFixed(2)}</p>
                            </div>
                            <div className="summary-card balance-positive">
                                <h3>Transactions</h3>
                                <p className="amount">{expenseTransactions.length}</p>
                            </div>
                        </div>

                        {/* ── Expense by Category ── */}
                        <div className="chart-container">
                            <h2>Expense by Category</h2>
                            <div className="analytics-section">
                                <PieChart data={byCategory} />
                                <BreakdownTable data={byCategory} label="Category" />
                            </div>
                        </div>

                        {/* ── Expense by Account ── */}
                        <div className="chart-container">
                            <h2>Expense by Account</h2>
                            <div className="analytics-section">
                                <PieChart data={byAccount} />
                                <BreakdownTable data={byAccount} label="Account" />
                            </div>
                        </div>

                        {/* ── Expense by Member ── */}
                        <div className="chart-container">
                            <h2>Expense by Member</h2>
                            <div className="analytics-section">
                                <PieChart data={byMember} />
                                <BreakdownTable data={byMember} label="Member" />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPage;
