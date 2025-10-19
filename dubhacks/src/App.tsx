import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import Layout from './components/common/Layout';
import { UserDashboard } from './components/user';
import { ConversationalSearch, EventFeed } from './components/search';
import { UserProfile, UserPreferences, SavedEvents } from './components/user';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <Router>
                        <div className="App">
                            <Routes>
                                {/* Public routes */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/auth" element={<AuthPage />} />
                                <Route path="/register" element={<AuthPage initialMode="register" />} />

                                {/* Protected routes with layout */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <UserDashboard />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                
                                <Route
                                    path="/search"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <ConversationalSearch />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                
                                <Route
                                    path="/events"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <EventFeed events={[]} />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                
                                <Route
                                    path="/profile"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <UserProfile />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                
                                <Route
                                    path="/preferences"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <UserPreferences />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                
                                <Route
                                    path="/saved-events"
                                    element={
                                        <ProtectedRoute>
                                            <Layout>
                                                <SavedEvents />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />

                                {/* Catch all route */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </div>
                    </Router>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;