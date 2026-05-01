import styles from './ChatSidebar.module.css';
import { useSocket } from '../../context/SocketContext';

export default function ChatSidebar({ conversations, activeId, onSelect }) {
  const { onlineUsers } = useSocket();

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>💬 Chats</h3>
      {conversations.length === 0 && (
        <p className={styles.empty}>No conversations yet.</p>
      )}
      {conversations.map(conv => (
        <div key={conv.id}
          className={`${styles.item} ${activeId === conv.id ? styles.active : ''}`}
          onClick={() => onSelect(conv)}>
          <div className={styles.avatar}>
            {conv.other_username?.[0]?.toUpperCase()}
            <span className={`${styles.dot} ${onlineUsers.has(conv.other_user_id) ? styles.online : styles.offline}`} />
          </div>
          <div className={styles.info}>
            <p className={styles.name}>{conv.other_username}</p>
            <p className={styles.last}>{conv.last_message || 'Start chatting...'}</p>
          </div>
        </div>
      ))}
    </aside>
  );
}
