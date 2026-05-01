import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import styles from './CallPopup.module.css';

export default function CallPopup() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('receive_call', ({ caller_id, call_type, call_log_id }) => {
      setIncoming({ caller_id, call_type, call_log_id });
    });
    socket.on('call_ended', () => setIncoming(null));
    return () => { socket.off('receive_call'); socket.off('call_ended'); };
  }, [socket]);

  if (!incoming) return null;

  const accept = () => {
    navigate('/call', { state: { incoming, call_type: incoming.call_type } });
    setIncoming(null);
  };

  const reject = () => {
    socket.emit('reject_call', { caller_id: incoming.caller_id, call_log_id: incoming.call_log_id });
    setIncoming(null);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <p className={styles.icon}>{incoming.call_type === 'video' ? '🎥' : '📞'}</p>
        <h3>Incoming {incoming.call_type} call</h3>
        <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem' }}>from User #{incoming.caller_id}</p>
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={accept}>Accept</button>
          <button className="btn btn-danger" onClick={reject}>Reject</button>
        </div>
      </div>
    </div>
  );
}
