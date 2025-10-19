import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FeaturedEvents } from '../components/home/FeaturedEvents';
import { Navbar } from '../components/common/Navbar';
import './FeaturedEventsPage.css';

export function FeaturedEventsPage() {
  const { state } = useAuth();
  const { isAuthenticated } = state;

  return (
    <div className="featured-events-page">
      {!isAuthenticated && <Navbar />}
      
      <div className="page-header">
        <h1>Featured Events</h1>
        <p>Discover the best events happening in your area, handpicked by our team.</p>
      </div>
      
      <FeaturedEvents limit={12} />
    </div>
  );
}