import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (() => {});

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;

  // If children is a function (render prop), call it with props
  if (typeof children === 'function') {
    return children({ user, onLogout: logout });
  }

  // Otherwise, clone element and pass user and logout as props if they expect them
  return React.cloneElement(children, { user, onLogout: logout });
};

export default ProtectedRoute;
