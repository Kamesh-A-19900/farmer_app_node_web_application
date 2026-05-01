import api from './api';

export const getConversations = () => api.get('/chat/conversations');
export const getMessages = (convId, page = 1) => api.get(`/chat/messages/${convId}`, { params: { page } });
export const startConversation = (other_user_id) => api.post('/chat/conversations', { other_user_id });
