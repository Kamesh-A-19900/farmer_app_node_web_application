import api from './api';

export const getWallet = () => api.get('/wallet');
export const topUp = (amount) => api.post('/wallet/topup', { amount });
