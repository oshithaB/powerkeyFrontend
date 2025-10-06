// src/api/axiosInstance.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


axiosInstance.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem('authToken');

    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp < currentTime) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('selectedCompany');
            delete axiosInstance.defaults.headers.common['Authorization'];
            window.location.href = '/login';
            alert('Your session has expired. Please log in again.');
            return Promise.reject(new Error('Token expired'));
        }

        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        config.headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('No auth token found, request will not include Authorization header');
        window.location.href = '/login';
        alert('You are not logged in. Please log in to continue.');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;