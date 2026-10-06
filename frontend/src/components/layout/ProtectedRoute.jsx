import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (user === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
    const isAllowed = user.permissions.some(permissionPath => {
      if (permissionPath === location.pathname) return true;
      if (permissionPath !== "/" && location.pathname.startsWith(permissionPath + "/")) return true;
      return false;
    });
    if (!isAllowed) {
      const fallbackPath = user.permissions[0] || "/login";
      return <Navigate to={fallbackPath} replace />;
    }
  } else {
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}
