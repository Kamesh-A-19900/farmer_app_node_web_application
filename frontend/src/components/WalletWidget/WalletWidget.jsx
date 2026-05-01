import { useState, useEffect } from 'react';
import api from '../../services/api';
import styles from './WalletWidget.module.css';

export default function WalletWidget() {
  const [balance, setBalance] = useState(null);
  const [topup, setTopup] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchBalance(); }, []);

  const fetchBalance = async () => {
    try {
      const { data } = await api.get('/wallet');
      setBalance(data.balance);
    } catch {}
  };

  const handleTopup = async () => {
    if (!topup || topup <= 0) return;
    try {
      await api.post('/wallet/topup', { amount: parseFloat(topup) });
      setMsg(`+₹${topup} added`);
      setTopup('');
      fetchBalance();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className={`card ${styles.widget}`}>
      <p className={styles.label}>Wallet Balance</p>
      <p className={styles.balance}>₹{balance !== null ? Number(balance).toFixed(2) : '...'}</p>
      <div className={styles.topupRow}>
        <input type="number" placeholder="Add amount" value={topup}
          onChange={e => setTopup(e.target.value)} className={styles.input} />
        <button className="btn btn-primary" onClick={handleTopup} style={{ whiteSpace: 'nowrap' }}>
          Add Money
        </button>
      </div>
      {msg && <p className="success-msg">{msg}</p>}
    </div>
  );
}
