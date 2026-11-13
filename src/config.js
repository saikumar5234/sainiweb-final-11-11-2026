// Backend configuration
// Use environment variable if available, otherwise use localhost in dev or production URL
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : 'https://api.sainidryfruits.com');
// export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/api' : 'https://api.sainidryfruits.com');
// export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://10.164.59.124:8080';
// Translation API configuration
export const TRANSLATION_CONFIG = {
  // Google Translate API (requires API key)
  GOOGLE_TRANSLATE_API: 'https://translation.googleapis.com/language/translate/v2',
  GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY', // Replace with your actual API key
  
  // LibreTranslate API (free alternative, no API key required)
  LIBRE_TRANSLATE_API: 'https://libretranslate.com/translate',
  
  // MyMemory API (free, no API key required)
  MYMEMORY_API: 'https://api.mymemory.translated.net/get'
};

// API endpoints
export const API_ENDPOINTS = {
  // Product endpoints
  PRODUCTS: `${BACKEND_BASE_URL}/api/products`,
  PRODUCT_PRICE: (productId) => `${BACKEND_BASE_URL}/api/products/${productId}/price`,
  PRODUCT_PRICE_HISTORY: (productId) => `${BACKEND_BASE_URL}/api/products/${productId}/price-history`,
  // GET /products/{productId}/images → List<Long> image IDs for product
  PRODUCT_IMAGES: (productId) => `${BACKEND_BASE_URL}/api/products/${productId}/images`,
  // GET /products/image/{imageId} → image bytes (image/jpeg)
  PRODUCT_IMAGE: (imageId) => `${BACKEND_BASE_URL}/api/products/image/${imageId}`,
  PRODUCT_IMAGE_DELETE: (imageId) => `${BACKEND_BASE_URL}/api/products/image/${imageId}`,
  PRODUCT_UPDATE: (productId) => `${BACKEND_BASE_URL}/api/products/${productId}`,
  DELETE_ALL_PRODUCTS: `${BACKEND_BASE_URL}/delete/all/products`,
  
  // Greeting endpoints
  GREETINGS: `${BACKEND_BASE_URL}/api/greetings`,
  
  // Auth endpoints
  LOGIN: `${BACKEND_BASE_URL}/api/login`,
  SIGNUP: `${BACKEND_BASE_URL}/api/signup`,
  ADMIN_LOGIN: `${BACKEND_BASE_URL}/api/admin-login`,
  ADMIN_SIGNUP: `${BACKEND_BASE_URL}/api/admin-signup`,
  
  // User management endpoints
  USERS: `${BACKEND_BASE_URL}/api/users`,
  USERS_PENDING: `${BACKEND_BASE_URL}/api/users/pending`,
  USER_SUMMARY: `${BACKEND_BASE_URL}/api/admin/user-summary`,
  USER_SESSIONS: `${BACKEND_BASE_URL}/api/admin/user-sessions`,
  USER_APPROVE: (userId) => `${BACKEND_BASE_URL}/api/users/${userId}/approve`,
  USER_REJECT: (userId) => `${BACKEND_BASE_URL}/api/users/${userId}/reject`,
  
  // Sub-admin management endpoints
  SUB_ADMINS: `${BACKEND_BASE_URL}/api/admin/sub-admins`,
  SUBADMINS: `${BACKEND_BASE_URL}/api/admin/subadmins`,
  SUBADMIN_DELETE: (id) => `${BACKEND_BASE_URL}/api/admin/subadmins/${id}`,
  
  // Admin OTP endpoints
  ADMIN_SEND_OTP: `${BACKEND_BASE_URL}/api/admin/send-otp`,
  ADMIN_VERIFY_OTP: `${BACKEND_BASE_URL}/api/admin/verify-otp`,

  // Superadmin endpoints
  SUPERADMIN_LOGIN: `${BACKEND_BASE_URL}/api/superadmin/login`,
  SUPERADMIN_FORGOT_PASSWORD: `${BACKEND_BASE_URL}/api/superadmin/forgot-password`,
  SUPERADMIN_VERIFY_OTP: `${BACKEND_BASE_URL}/api/superadmin/verify-otp`,
  SUPERADMIN_RESET_PASSWORD: `${BACKEND_BASE_URL}/api/superadmin/reset-password`,
  
  // Banner endpoints
  BANNER_TEXT: `${BACKEND_BASE_URL}/api/banner-text`,
  
  // Category endpoints
  CATEGORIES: `${BACKEND_BASE_URL}/api/categories`,
  CATEGORY_CREATE: `${BACKEND_BASE_URL}/api/categories`,
  CATEGORY_UPDATE: (categoryId) => `${BACKEND_BASE_URL}/api/categories/${categoryId}`,
  CATEGORY_DELETE: (categoryId) => `${BACKEND_BASE_URL}/api/categories/${categoryId}`
};

