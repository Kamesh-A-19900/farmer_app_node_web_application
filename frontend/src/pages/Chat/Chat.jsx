import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './Chat.module.css';

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('receive_message', (msg) => {
      if (msg.conversation_id === activeConv?.id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('message_seen', { message_id: msg.id, conversation_id: msg.conversation_id, other_user_id: msg.sender_id });
      }
      fetchConversations();
    });
    socket.on('typing', ({ conversation_id }) => {
      if (conversation_id === activeConv?.id) setTyping(true);
    });
    socket.on('stop_typing', ({ conversation_id }) => {
      if (conversation_id === activeConv?.id) setTyping(false);
    });
    return () => { socket.off('receive_message'); socket.off('typing'); socket.off('stop_typing'); };
  }, [socket, activeConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async () => {
    try { const { data } = await api.get('/chat/conversations'); setConversations(data); }
    catch {}
  };

  const openConversation = async (conv) => {
    setActiveConv(conv); setPage(1);
    try {
      const { data } = await api.get(`/chat/messages/${conv.id}`, { params: { page: 1 } });
      setMessages(data);
    } catch {}
  };

  const sendMessage = () => {
    if (!text.trim() || !activeConv || !socket) return;
    socket.emit('send_message', { conversation_id: activeConv.id, message_text: text });
    setText('');
    socket.emit('stop_typing', { conversation_id: activeConv.id, other_user_id: activeConv.other_user_id });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit('typing', { conversation_id: activeConv.id, other_user_id: activeConv.other_user_id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { conversation_id: activeConv.id, other_user_id: activeConv.other_user_id });
    }, 1000);
  };

  const startCall = (type) => {
    navigate('/call', { state: { receiver_id: activeConv.other_user_id, call_type: type, receiver_name: activeConv.other_username } });
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.chatLayout}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>💬 Messages</h3>
          {conversations.map(conv => (
            <div key={conv.id}
              className={`${styles.convItem} ${activeConv?.id === conv.id ? styles.active : ''}`}
              onClick={() => openConversation(conv)}>
              <div className={styles.convAvatar}>
                {conv.other_username?.[0]?.toUpperCase()}
                <span className={`${styles.dot} ${onlineUsers.has(conv.other_user_id) ? styles.online : styles.offline}`} />
              </div>
              <div className={styles.convInfo}>
                <p className={styles.convName}>{conv.other_username}</p>
                <p className={styles.convLast}>{conv.last_message || 'No messages yet'}</p>
              </div>
            </div>
          ))}
          {conversations.length === 0 && <p style={{ padding:16, color:'var(--color-secondary)', fontSize:'0.9rem' }}>No conversations yet.</p>}
        </aside>

        <main className={styles.chatMain}>
          {activeConv ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.convAvatar} style={{ width:36, height:36, fontSize:'1rem' }}>
                  {activeConv.other_username?.[0]?.toUpperCase()}
                  <span className={`${styles.dot} ${onlineUsers.has(activeConv.other_user_id) ? styles.online : styles.offline}`} />
                </div>
                <div>
                  <p style={{ fontWeight:700 }}>{activeConv.other_username}</p>
                  <p style={{ fontSize:'0.8rem', color:'var(--color-secondary)' }}>
                    {onlineUsers.has(activeConv.other_user_id) ? '🟢 Online' : '⚫ Offline'}
                  </p>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                  <button className="btn btn-outline" style={{ padding:'6px 12px' }} onClick={() => startCall('audio')}>📞</button>
                  <button className="btn btn-outline" style={{ padding:'6px 12px' }} onClick={() => startCall('video')}>🎥</button>
                </div>
              </div>

              <div className={styles.messages}>
                {messages.map(m => (
                  <div key={m.id} className={`${styles.msg} ${m.sender_id === user.userId ? styles.mine : styles.theirs}`}>
                    <p>{m.message_text}</p>
                    <span className={styles.msgMeta}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      {m.sender_id === user.userId && (m.seen_status ? ' ✓✓' : ' ✓')}
                    </span>
                  </div>
                ))}
                {typing && <div className={styles.typingIndicator}>typing...</div>}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <input placeholder="Type a message..."
                  value={text} onChange={handleTyping}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                <button className="btn btn-primary" onClick={sendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className={styles.noConv}>
              <p>Select a conversation to start chatting 💬</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
