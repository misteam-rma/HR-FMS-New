import { Navigate } from 'react-router-dom';
import { getDefaultRouteForUser, getStoredUser, normalizeRole } from '../utils/auth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length) {
    const currentRole = normalizeRole(user?.Role ?? user?.role ?? user?.Admin);
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to={getDefaultRouteForUser(user)} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
