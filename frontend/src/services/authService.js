import api from './api';

export const register = (data) => api.post('/auth/register', data);
export const verifyOtp = (phone, otp, purpose) => api.post('/auth/verify-otp', { phone, otp, purpose });
export const login = (data) => api.post('/auth/login', data);
export const forgotPassword = (phone) => api.post('/auth/forgot-password', { phone });
export const resetPassword = (phone, otp, newPassword) => api.post('/auth/reset-password', { phone, otp, newPassword });
