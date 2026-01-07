import axios from 'axios';

// Get API URL from environment variable or use default
let API_URL = import.meta.env.VITE_API_URL;

// If no API URL is set, use relative URLs (same domain) for production
// This works when frontend and backend are served from the same domain (custom domain)
if (!API_URL) {
  if (import.meta.env.PROD) {
    // Production: Use relative URLs (same domain)
    API_URL = '';
  } else {
    // Development: Use localhost
    API_URL = 'http://localhost:5000';
  }
}

// If API_URL is just a hostname (from Render service reference), construct full URL
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://') && API_URL !== '') {
  // Check if it's a Render service hostname (contains service name pattern)
  // Render service references return just the hostname like "microfinance-backend-t5nm"
  if (API_URL.includes('microfinance-backend') || API_URL.match(/^[a-z0-9-]+$/)) {
    // Construct full Render URL
    API_URL = `https://${API_URL}.onrender.com`;
  }
}

console.log('API Client initialized with URL:', API_URL || '(relative - same domain)');
console.log('VITE_API_URL env var:', import.meta.env.VITE_API_URL);
console.log('Production mode:', import.meta.env.PROD);

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

