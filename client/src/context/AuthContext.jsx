import { createContext, useState, useEffect } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role = localStorage.getItem('role') || sessionStorage.getItem('role');
    const firstName = localStorage.getItem('firstName') || sessionStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName') || sessionStorage.getItem('lastName');
    const email = localStorage.getItem('email') || sessionStorage.getItem('email');
    if (token && role) setUser({ token, role, firstName, lastName, email });
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const { data } = await API.post('/auth/login', { email, password });
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', data.token);
    storage.setItem('role', data.role);
    storage.setItem('firstName', data.firstName);
    storage.setItem('lastName', data.lastName);
    storage.setItem('email', data.email);
    setUser({ token: data.token, role: data.role, firstName: data.firstName, lastName: data.lastName, email: data.email });

    if (data.role === 'admin') navigate('/admin-dashboard');
    else if (data.role === 'clinician') navigate('/clinician-dashboard');
    else if (data.role === 'therapist') navigate('/therapist-dashboard');
    else if (data.role === 'parent') navigate('/parent-dashboard');
    else if (data.role === 'lab') navigate('/lab-dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('email');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('firstName');
    sessionStorage.removeItem('lastName');
    sessionStorage.removeItem('email');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
