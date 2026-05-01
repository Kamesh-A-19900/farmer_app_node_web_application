import { useState, useEffect } from 'react';
import api from '../services/api';

export const useWallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/wallet');
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch {}
    setLoading(false);
  };

  const topUp = async (amount) => {
    await api.post('/wallet/topup', { amount });
    await fetch();
  };

  useEffect(() => { fetch(); }, []);

  return { balance, transactions, loading, topUp, refresh: fetch };
};
