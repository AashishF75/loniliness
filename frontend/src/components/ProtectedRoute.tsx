import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { userService } from '../services/userService';

export function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        } else {
          localStorage.removeItem('saathi_auth_token');
          setIsAuthenticated(false);
        }
      } catch (err) {
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

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
