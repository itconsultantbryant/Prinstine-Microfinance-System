import axios from 'axios';

// Get API URL from environment variable or use default
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// If API_URL is just a hostname (from Render service reference), construct full URL
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
  // Assume it's a Render service hostname, construct full URL
  API_URL = `https://${API_URL}.onrender.com`;
}

console.log('API Client initialized with URL:', API_URL);

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

