import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isError } = useCurrentUser({ retry: false });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0b1e] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) return <Navigate to="/" replace />;

  return <>{children}</>;
}
