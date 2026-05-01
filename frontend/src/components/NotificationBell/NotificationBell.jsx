import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    if (!socket) return;

    // Order notifications for farmers
    socket.on('new_order', (notif) => {
      setNotifications(prev => [{ id: Date.now(), action: 'new_order', metadata: notif, timestamp: new Date() }, ...prev]);
    });

    // Auction completion notifications for farmers
    socket.on('auction_completed', (notif) => {
      setNotifications(prev => [{ id: Date.now(), action: notif.type, metadata: notif, timestamp: new Date() }, ...prev]);
    });

    return () => {
      socket.off('new_order');
      socket.off('auction_completed');
    };
  }, [socket]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch both order and auction notifications for farmers
      if (user?.role === 'farmer') {
        const [orderRes, auctionRes] = await Promise.all([
          api.get('/orders/notifications'),
          api.get('/orders/auction-notifications'),
        ]);
        const combined = [...orderRes.data, ...auctionRes.data]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(combined);
      }
    } catch {}
  };

  const clearAll = async () => {
    try {
      if (user?.role === 'farmer') {
        await Promise.all([
          api.delete('/orders/notifications'),
          api.delete('/orders/auction-notifications'),
        ]);
      }
      setNotifications([]);
      setOpen(false);
    } catch {}
  };

  const count = notifications.length;

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.bell} onClick={() => setOpen(o => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && <span className={styles.badge}>{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span>Notifications</span>
            {count > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>

          {count === 0 ? (
            <p className={styles.empty}>No new notifications</p>
          ) : (
            <div className={styles.list}>
              {notifications.map((n, i) => {
                const data = n.metadata || {};
                const isOrder = n.action === 'new_order';
                const isAuctionDone = n.action === 'auction_completed';
                const isNoBids = n.action === 'auction_no_bids';

                return (
                  <div key={n.id || i} className={`${styles.item} ${isNoBids ? styles.itemWarn : ''}`}>
                    <p className={styles.itemTitle}>
                      {isOrder && `New order from ${data.customer_name || 'customer'}`}
                      {isAuctionDone && `Auction completed — Rs. ${data.winning_amount}`}
                      {isNoBids && `Auction ended with no bids`}
                    </p>
                    <p className={styles.itemSub}>
                      {isOrder && `Order #${data.order_id} · Rs. ${Number(data.total || 0).toFixed(2)}`}
                      {(isAuctionDone || isNoBids) && data.message}
                    </p>
                    {isOrder && data.items && (
                      <p className={styles.itemProducts}>
                        {data.items.map(it => `${it.name} × ${it.quantity}kg`).join(', ')}
                      </p>
                    )}
                    <p className={styles.itemTime}>
                      {new Date(n.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


