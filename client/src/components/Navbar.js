import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      // optional: handle error
      console.error(e);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/dashboard" className="navbar-brand">
          CoLedge
        </Link>
      </div>

      <div className="navbar-right">
        <Link to="/transactions" className="navbar-link">
          Transactions
        </Link>
        <Link to="/split" className="navbar-link">
          Split
        </Link>

        {currentUser ? (
          <>
            <span className="navbar-user">{currentUser.email}</span>
            <button className="navbar-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              Login
            </Link>
            <Link to="/register" className="navbar-link">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;