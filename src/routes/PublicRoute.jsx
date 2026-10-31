import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect authenticated users to their corresponding area
    const destination = role === 'customer' ? '/portal' : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
}
