/**
 * Utility functions for handling image URLs
 * Works in both development and production environments
 */

import apiClient from '../config/axios';

/**
 * Get the base URL for API requests
 * Returns empty string for relative URLs (production) or full URL (development)
 */
const getBaseUrl = () => {
  const baseURL = apiClient.defaults.baseURL || '';
  // If baseURL is empty or starts with http, return it
  if (!baseURL || baseURL.startsWith('http')) {
    return baseURL;
  }
  // Otherwise, construct from window location (for production)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

/**
 * Construct full URL for uploaded images
 * @param {string} imagePath - The image path stored in database (e.g., "clients/filename.jpg")
 * @returns {string} Full URL to the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If imagePath is already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  const baseURL = getBaseUrl();
  
  // Remove leading slash from imagePath if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Construct URL
  if (baseURL) {
    // Development or explicit base URL
    return `${baseURL}/uploads/${cleanPath}`;
  } else {
    // Production - use relative URL
    return `/uploads/${cleanPath}`;
  }
};

/**
 * Get default avatar placeholder
 */
export const getDefaultAvatar = () => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RlZTJlNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4=';
};

