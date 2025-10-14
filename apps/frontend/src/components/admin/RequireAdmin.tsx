import { useQuery } from '@tanstack/react-query';
import { authMe } from '@/services/api';
import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';

export default function RequireAdmin({ children }: { children: React.ReactElement }) {
  const loc = useLocation();
  const { data, isLoading } = useQuery({ queryKey: ['auth-me'], queryFn: authMe, staleTime: 60_000 });

  if (isLoading) return <div className="p-10">Checking session…</div>;
  if (!data) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  return children;
}

