import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const history = useHistory();

  const handleLogout = async () => {
    try {
      await logout();
      history.push('/login');
    } catch (err) {
      alert('Failed to logout');
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">CoLedge</div>
        <div className="nav-user">
          <span>Welcome, {currentUser?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <p>Welcome to CoLedge Money Manager!</p>
        <div className="dashboard-cards">
          <div className="card">
            <h3>Add Expense</h3>
            <p>Add a new expense to split with friends</p>
            <button>Coming Soon</button>
          </div>
          <div className="card">
            <h3>View Expenses</h3>
            <p>See all your expenses and settlements</p>
            <button>Coming Soon</button>
          </div>
          <div className="card">
            <h3>Friends</h3>
            <p>Manage your friend list</p>
            <button>Coming Soon</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;