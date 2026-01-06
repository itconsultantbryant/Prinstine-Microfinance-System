import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../config/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login with email:', email);
      console.log('API URL:', apiClient.defaults.baseURL);
      
      const response = await apiClient.post('/api/auth/login', { email, password });
      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);
      console.log('Login response data type:', typeof response.data);
      console.log('Login response data:', response.data);
      console.log('Login response data stringified:', JSON.stringify(response.data, null, 2));
      
      // Handle case where response.data might be a string that needs parsing
      let responseData = response.data;
      if (typeof responseData === 'string' && responseData.trim()) {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
        }
      }
      
      if (responseData && responseData.success && responseData.data) {
        const { user, token } = responseData.data;
        
        if (!token) {
          console.error('No token in response');
          return {
            success: false,
            message: 'Login failed: No token received'
          };
        }
        
        if (!user) {
          console.error('No user in response');
          return {
            success: false,
            message: 'Login failed: No user data received'
          };
        }
        
        setToken(token);
        setUser(user);
        localStorage.setItem('token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Login successful, user set:', user.email);
        return { success: true };
      } else {
        console.error('Invalid response structure:', responseData);
        return {
          success: false,
          message: responseData?.message || 'Login failed: Invalid response'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg || 
                          error.message || 
                          'Login failed';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

