import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <h2>💰 CoLedge</h2>
                </div>

                <ul className="nav-menu">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                            onClick={() => navigate('/dashboard')}
                        >
                            Dashboard
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${isActive('/transactions') ? 'active' : ''}`}
                            onClick={() => navigate('/transactions')}
                        >
                            Transactions
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${isActive('/split') ? 'active' : ''}`}
                            onClick={() => navigate('/split')}
                        >
                            Split Expense
                        </button>
                    </li>
                </ul>

                <div className="navbar-user">
                    <span className="user-email">{user?.email}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
