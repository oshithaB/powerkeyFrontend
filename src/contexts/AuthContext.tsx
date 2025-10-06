import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
  fullname: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    const companyData = sessionStorage.getItem('selectedCompany');

    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        console.warn('Token has expired');
        localStorage.removeItem('authToken');
        if (userData) {
          localStorage.removeItem('user');
        }
        if (companyData) {
          sessionStorage.removeItem('selectedCompany');
        }
        delete axiosInstance.defaults.headers.common['Authorization'];
        setUser(null);
        navigate('/login'); // Redirect to login if token is expired
        return;
      } else {
        console.log('Token is valid');
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser?.fullname) {
              setUser(parsedUser);
            } else {
              console.warn('Invalid user object in localStorage:', parsedUser);
            }
          } catch (err) {
            console.error('Failed to parse user from localStorage:', err);
          }
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/login', { email, password });
      const { token, user: userData } = response.data;

      if (!userData.fullname) {
        console.warn('Missing fullname in backend response:', userData);
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      await axios.post('/api/signup', {
        username: email.split('@')[0],
        fullname: `${firstName} ${lastName}`,
        email,
        password,
        role_id: 1,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('selectedCompany');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await axios.post('/api/userVerification', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send verification code');
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const response = await axios.post('/api/OTPVerification', { email, otp });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Invalid or expired verification code');
    }
  };

  const resetPassword = async (email: string, newPassword: string) => {
    try {
      const response = await axios.post('/api/resetPassword', { email, newPassword });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    requestPasswordReset,
    verifyOtp,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}