import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const AnalyticsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const expenseData = {
        'Food': 500,
        'Transportation': 200,
        'Shopping': 300,
        'Utilities': 150,
        'Entertainment': 100
    };

    const incomeData = {
        'Salary': 5000,
        'Bonus': 1000,
        'Interest': 200
    };

    const totalExpense = Object.values(expenseData).reduce((a, b) => a + b, 0);
    const totalIncome = Object.values(incomeData).reduce((a, b) => a + b, 0);
    const balance = totalIncome - totalExpense;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

                <div className="summary-cards">
                    <div className="summary-card income">
                        <h3>Income</h3>
                        <p className="amount">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="summary-card expense">
                        <h3>Expense</h3>
                        <p className="amount">${totalExpense.toFixed(2)}</p>
                    </div>
                    <div className={`summary-card ${balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                        <h3>Balance</h3>
                        <p className="amount">${balance.toFixed(2)}</p>
                    </div>
                </div>

                <div className="chart-container">
                    <h2>Expense by Category</h2>
                    <div className="category-list">
                        {Object.entries(expenseData).map(([category, amount]) => (
                            <div key={category} className="category-item">
                                <span className="category-name">{category}</span>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${(amount / totalExpense) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="category-amount">${amount.toFixed(2)}</span>
                                <span className="category-percent">
                                    {((amount / totalExpense) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-container">
                    <h2>Income by Category</h2>
                    <div className="category-list">
                        {Object.entries(incomeData).map(([category, amount]) => (
                            <div key={category} className="category-item">
                                <span className="category-name">{category}</span>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill income-fill" 
                                        style={{ width: `${(amount / totalIncome) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="category-amount">${amount.toFixed(2)}</span>
                                <span className="category-percent">
                                    {((amount / totalIncome) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-container">
                    <h2>Monthly Trend</h2>
                    <div className="monthly-chart">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
                            <div key={month} className="month-bar">
                                <div 
                                    className="bar" 
                                    style={{ height: `${100 + (idx * 20)}px` }}
                                ></div>
                                <span>{month}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
