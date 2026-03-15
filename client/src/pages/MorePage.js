import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileTabBar from '../components/MobileTabBar';
import './Dashboard.css';

const MorePage = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <nav className="navbar">
                <div className="navbar-brand">🏦 CoLedge</div>
                <div className="nav-links">
                    {currentUser && <span className="user-email">{currentUser.email}</span>}
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>More</h1>
                </div>

                <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 'var(--radius-md, 10px)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border-light, #E3D5CA)', overflow: 'hidden', marginBottom: '20px' }}>
                    {currentUser && (
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light, #E3D5CA)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #656D4A)', marginBottom: '4px' }}>Signed in as</div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text, #283618)', wordBreak: 'break-all' }}>{currentUser.email}</div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '16px 20px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--color-danger, #BF4342)',
                            fontSize: '15px',
                            fontWeight: 600,
                        }}
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            <MobileTabBar />
        </div>
    );
};

export default MorePage;
