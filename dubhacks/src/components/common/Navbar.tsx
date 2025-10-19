import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          Evently
        </Link>
        
        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/search" className="nav-link">Search</Link>
              <Link to="/featured-events" className="nav-link">Featured Events</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={logout} className="nav-link btn-link">Logout</button>
            </>
          ) : (
            <>
              <Link to="/featured-events" className="nav-link">Featured Events</Link>
              <Link to="/auth" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}