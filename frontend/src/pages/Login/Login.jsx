import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EyeOpen, EyeClosed } from '../../components/EyeIcon/EyeIcon';
import styles from './Login.module.css';

export default function Login() {
  const [role, setRole] = useState('customer');
  const [username, setUsername] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { role, password };
      if (role === 'farmer') payload.farmer_id = farmerId;
      else payload.username = username;

      const { data } = await api.post('/auth/login', payload);
      login({ userId: data.userId, role: data.role, username: data.username, farmerId: data.farmerId }, data.token);
      if (data.role === 'farmer') navigate('/farmer/dashboard');
      else if (data.role === 'admin') navigate('/admin-secret-dashboard');
      else navigate('/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to Home</button>

        <div className={styles.header}>
          <h2 className={styles.title}>🌿 Welcome Back</h2>
          <p className={styles.sub}>Login to AgriMarket</p>
        </div>

        <div className={styles.roleTabs}>
          {['customer', 'farmer', 'admin'].map(r => (
            <button key={r} type="button"
              className={`${styles.roleTab} ${role === r ? styles.roleTabActive : ''}`}
              onClick={() => { setRole(r); setError(''); }}>
              {r === 'customer' ? '🛒 Customer' : r === 'farmer' ? '🧑‍🌾 Farmer' : '🔐 Admin'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {role === 'farmer' ? (
            <div className={styles.field}>
              <label>Farmer ID</label>
              <input type="number" placeholder="Enter your Farmer ID (e.g. 3)"
                value={farmerId} onChange={e => setFarmerId(e.target.value)} required autoFocus />
              <span className={styles.hint}>Your Farmer ID was shown when you registered</span>
            </div>
          ) : (
            <div className={styles.field}>
              <label>Username</label>
              <input placeholder={role === 'admin' ? 'Admin username' : 'Enter your username'}
                value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
          )}

          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(s => !s)}>
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className={styles.links}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
