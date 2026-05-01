import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import api from '../../services/api';
import styles from './AdminDashboard.module.css';

const TABS = ['Analytics', 'Users', 'Products', 'Logs', 'Transactions'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchTab(tab); }, [tab]);

  const fetchTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'Analytics') {
        const { data } = await api.get('/admin/analytics');
        setAnalytics(data);
      } else if (t === 'Users') {
        const { data } = await api.get('/admin/users');
        setUsers(data);
      } else if (t === 'Products') {
        const { data } = await api.get('/admin/products');
        setProducts(data);
      } else if (t === 'Logs') {
        const { data } = await api.get('/admin/logs');
        setLogs(data);
      } else if (t === 'Transactions') {
        const { data } = await api.get('/admin/transactions');
        setTransactions(data);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <div className="container" style={{ padding: 'calc(var(--sp)*3) calc(var(--sp)*2)' }}>
        <h2 className={styles.title}>🔐 Admin Panel</h2>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {loading && <p>Loading...</p>}

        {!loading && tab === 'Analytics' && analytics && (
          <div className="grid-4" style={{ marginTop: 'calc(var(--sp)*2)' }}>
            {[
              { label: 'Total Users', value: analytics.totalUsers, icon: '👥' },
              { label: 'Total Products', value: analytics.totalProducts, icon: '🌾' },
              { label: 'Total Orders', value: analytics.totalOrders, icon: '📦' },
              { label: 'Total Revenue', value: `₹${Number(analytics.totalRevenue).toFixed(2)}`, icon: '💰' },
            ].map(stat => (
              <div key={stat.label} className={`card ${styles.statCard}`}>
                <p className={styles.statIcon}>{stat.icon}</p>
                <p className={styles.statValue}>{stat.value}</p>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'Users' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>ID</th><th>Username</th><th>Phone</th><th>Role</th><th>Wallet</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.phone}</td>
                    <td><span className={`${styles.badge} ${styles[u.role]}`}>{u.role}</span></td>
                    <td>₹{u.wallet_balance}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'Products' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>ID</th><th>Name</th><th>Farmer</th><th>Price/kg</th><th>Qty</th><th>Created</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.farmer_name}</td>
                    <td>₹{p.price_per_kg}</td>
                    <td>{p.quantity_kg}kg</td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'Logs' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>ID</th><th>User</th><th>Action</th><th>Metadata</th><th>Time</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.id}</td>
                    <td>{l.username || l.user_id || '—'}</td>
                    <td>{l.action}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.metadata ? JSON.stringify(l.metadata) : '—'}
                    </td>
                    <td>{new Date(l.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'Transactions' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>ID</th><th>User</th><th>Amount</th><th>Type</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.username}</td>
                    <td>₹{t.amount}</td>
                    <td><span className={`${styles.badge} ${styles[t.type]}`}>{t.type}</span></td>
                    <td>{t.status}</td>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
