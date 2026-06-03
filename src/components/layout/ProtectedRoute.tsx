import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gm-bg">
        <Spinner size={32} />
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
