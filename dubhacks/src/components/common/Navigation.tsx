import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/dashboard">
            <h1>EventSync</h1>
          </Link>
        </div>
        
        <div className="nav-links">
          <Link 
            to="/dashboard" 
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/search" 
            className={`nav-link ${isActive('/search') ? 'active' : ''}`}
          >
            Search
          </Link>
          <Link 
            to="/featured-events" 
            className={`nav-link ${isActive('/featured-events') ? 'active' : ''}`}
          >
            Featured
          </Link>
          <Link 
            to="/events" 
            className={`nav-link ${isActive('/events') ? 'active' : ''}`}
          >
            Events
          </Link>
          <Link 
            to="/saved-events" 
            className={`nav-link ${isActive('/saved-events') ? 'active' : ''}`}
          >
            Saved
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
          >
            Profile
          </Link>
          <Link 
            to="/preferences" 
            className={`nav-link ${isActive('/preferences') ? 'active' : ''}`}
          >
            Settings
          </Link>
        </div>

        <div className="nav-user">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;