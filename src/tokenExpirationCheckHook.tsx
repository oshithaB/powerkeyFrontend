import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from './axiosInstance';

export default function useTokenExpirationCheck( ) {
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(location.pathname);
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      console.warn('No auth token found');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < currentTime) {
        // Token expired
        localStorage.clear();
        sessionStorage.removeItem('selectedCompany');
        delete axiosInstance.defaults.headers.common['Authorization'];
        navigate('/login');

        alert('Your session has expired. Please log in again.');
        console.warn('Token has expired, redirecting to login');
      }
    } catch (error) {
      // Invalid token or parse error
      localStorage.clear();
      sessionStorage.removeItem('selectedCompany');
      delete axiosInstance.defaults.headers.common['Authorization'];
      navigate('/login');
      console.error('Invalid token, redirecting to login', error);
    } finally {
      setIsChecking(false);
    }

  }, [location.pathname, navigate]);

  return isChecking;
}
