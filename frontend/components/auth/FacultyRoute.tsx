import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface FacultyRouteProps {
  children: React.ReactElement;
}

export const FacultyRoute: React.FC<FacultyRouteProps> = ({ children }) => {
  const { isFaculty, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isFaculty) {
    return <Navigate to="/" replace />;
  }

  return children;
};
