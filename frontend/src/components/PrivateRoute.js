import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { API_URL } from '../config/api';

function PrivateRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setAllowed(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          localStorage.removeItem('adminToken');
          setAllowed(false);
          return;
        }
        setAllowed(true);
      } catch {
        localStorage.removeItem('adminToken');
        setAllowed(false);
      }
    };

    verify();
  }, []);

  if (allowed === null) {
    return <div className="management-loading"><span className="spinner" /></div>;
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default PrivateRoute;
