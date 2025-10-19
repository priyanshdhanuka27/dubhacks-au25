import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import './LandingPage.css';

export function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Find Your Vibe</h1>
          <p className="hero-tagline">
            Discover events that match your energy using AI-powered recommendations
          </p>
          <div className="hero-cta">
            <Link to="/register" className="cta-button primary">
              Get Started
            </Link>
            <Link to="/search" className="cta-button secondary">
              Explore Events
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="features">
        <h2>Why Evently?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3>AI-Powered Discovery</h3>
            <p>Chat naturally to find events - our AI understands your vibe and finds the perfect matches</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">✨</span>
            <h3>Personalized For You</h3>
            <p>Get tailored recommendations based on your interests, location, and past experiences</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🤝</span>
            <h3>Connect &amp; Share</h3>
            <p>Easily plan with friends, share events, and build your social calendar together</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Tell Us Your Interests</h3>
            <p>Quick profile setup with your favorite event types and preferences</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Chat Naturally</h3>
            <p>Ask anything like "EDM events this weekend under $30" - our AI gets you</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Save &amp; Share</h3>
            <p>Bookmark events, add to calendar, and share with friends instantly</p>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="social-proof">
        <h2>Join the Community</h2>
        <div className="stats">
          <div className="stat">
            <h3>10k+</h3>
            <p>Active Users</p>
          </div>
          <div className="stat">
            <h3>5k+</h3>
            <p>Events Weekly</p>
          </div>
          <div className="stat">
            <h3>4.8⭐</h3>
            <p>User Rating</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Find Your Next Event?</h2>
        <p>Join thousands of others discovering amazing events every day</p>
        <Link to="/register" className="cta-button primary large">
          Start Exploring
        </Link>
      </section>
    </div>
  );
}