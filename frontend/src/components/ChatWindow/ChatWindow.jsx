import { useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './ChatWindow.module.css';

export default function ChatWindow({ messages, typing, text, onTextChange, onSend, onCall, conversation }) {
  const { user } = useAuth();
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <div className={styles.avatar}>{conversation?.other_username?.[0]?.toUpperCase()}</div>
        <div>
          <p style={{ fontWeight: 700 }}>{conversation?.other_username}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onCall('audio')}>📞</button>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onCall('video')}>🎥</button>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.msg} ${m.sender_id === user.userId ? styles.mine : styles.theirs}`}>
            <p>{m.message_text}</p>
            <span className={styles.meta}>
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {m.sender_id === user.userId && (m.seen_status ? ' ✓✓' : ' ✓')}
            </span>
          </div>
        ))}
        {typing && <div className={styles.typing}>typing...</div>}
        <div ref={endRef} />
      </div>

      <div className={styles.input}>
        <input placeholder="Type a message..." value={text} onChange={onTextChange}
          onKeyDown={e => e.key === 'Enter' && onSend()} />
        <button className="btn btn-primary" onClick={onSend}>Send</button>
      </div>
    </div>
  );
}
