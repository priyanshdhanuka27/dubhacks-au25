import React from 'react';
import { Link } from 'react-router-dom';
import { FeaturedEvents } from '../components/home/FeaturedEvents';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Events with <span className="highlight">AI-Powered Search</span>
          </h1>
          <p className="hero-description">
            Find the perfect events using natural language. Just ask "What music events are happening this weekend?" 
            and let our AI help you discover amazing experiences in your area.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="cta-button primary">
              Get Started Free
            </Link>
            <button className="cta-button secondary">
              Try AI Search
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="search-demo">
            <div className="search-bubble user">
              "Find tech events in Seattle this week"
            </div>
            <div className="search-bubble ai">
              I found 12 tech events in Seattle! Here are the top matches...
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2>Why Choose EventSync?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Search</h3>
              <p>Ask questions in natural language and get intelligent event recommendations tailored to your interests.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Calendar Integration</h3>
              <p>Add events directly to Google Calendar, Outlook, Apple Calendar, or download .ics files with one click.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Personalized Recommendations</h3>
              <p>Get event suggestions based on your preferences, location, and past interests for a curated experience.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💾</div>
              <h3>Save & Organize</h3>
              <p>Save events you're interested in and organize them with tags for easy access and planning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="featured-section">
        <FeaturedEvents />
      </section>

      {/* CTA Section */}
      <section className="final-cta-section">
        <div className="final-cta-content">
          <h2>Ready to Discover Amazing Events?</h2>
          <p>Join thousands of users who are already finding their perfect events with AI-powered search.</p>
          <div className="final-cta-actions">
            <Link to="/auth" className="cta-button primary large">
              Create Your Free Account
            </Link>
            <div className="cta-features">
              <span>✓ Personalized recommendations</span>
              <span>✓ Calendar integration</span>
              <span>✓ Save unlimited events</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}