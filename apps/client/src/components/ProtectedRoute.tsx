import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0b1e] flex items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-violet-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
