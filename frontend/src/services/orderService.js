import api from './api';

export const getOrders = () => api.get('/orders');
export const createOrder = () => api.post('/orders');
export const getCart = () => api.get('/cart');
export const addToCart = (product_id, quantity) => api.post('/cart', { product_id, quantity });
export const updateCart = (id, quantity) => api.put(`/cart/${id}`, { quantity });
export const removeFromCart = (id) => api.delete(`/cart/${id}`);
