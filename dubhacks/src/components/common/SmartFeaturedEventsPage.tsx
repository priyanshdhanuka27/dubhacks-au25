import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FeaturedEventsPage } from '../../pages/FeaturedEventsPage';
import Layout from './Layout';

export function SmartFeaturedEventsPage() {
  const { state } = useAuth();
  const { isAuthenticated } = state;

  if (isAuthenticated) {
    return (
      <Layout>
        <FeaturedEventsPage />
      </Layout>
    );
  }

  return <FeaturedEventsPage />;
}