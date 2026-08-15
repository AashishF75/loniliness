import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';

export function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('saathi_auth_token');
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        const user = await userService.getUser();
        if (user) {
          setIsAuthenticated(true);
          setUserRole(user.role);
        } else {
          localStorage.removeItem('saathi_auth_token');
          localStorage.removeItem('saathi_user');
          setIsAuthenticated(false);
        }
      } catch (err) {
        localStorage.removeItem('saathi_auth_token');
        localStorage.removeItem('saathi_user');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Loading Saathi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin routing logic
  if (userRole === 'ADMIN' && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />;
  }
  if (userRole !== 'ADMIN' && location.pathname === '/admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
