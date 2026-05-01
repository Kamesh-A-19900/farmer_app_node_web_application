import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EyeOpen, EyeClosed } from '../../components/EyeIcon/EyeIcon';
import styles from './Register.module.css';

export default function Register() {
  const [form, setForm] = useState({ username: '', phone: '', password: '', confirmPassword: '', role: 'customer' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        username: form.username,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
      });
      // Auto-login
      login({ userId: data.userId, role: data.role, username: data.username, farmerId: data.farmerId }, data.token);

      // Show farmer ID before redirecting
      if (data.role === 'farmer') {
        alert(`✅ Registration successful!\n\nYour Farmer ID is: ${data.farmerId}\n\nPlease save this — you'll need it to login.`);
      }
      navigate(data.role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <h2 className={styles.title}>🌱 Join AgriMarket</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Role selector */}
          <div className={styles.roleRow}>
            {['customer', 'farmer'].map(r => (
              <button key={r} type="button"
                className={`${styles.roleBtn} ${form.role === r ? styles.roleActive : ''}`}
                onClick={() => setForm(f => ({ ...f, role: r }))}>
                {r === 'farmer' ? '🧑‍🌾 Farmer' : '🛒 Customer'}
              </button>
            ))}
          </div>

          {form.role === 'farmer' && (
            <div className={styles.infoBox}>
              ℹ️ After registering, you'll receive a <strong>Farmer ID</strong>. Save it — you'll use it to login.
            </div>
          )}

          <div className={styles.field}>
            <label>Username *</label>
            <input placeholder="Choose a username (min 3 chars)"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required minLength={3} />
          </div>

          <div className={styles.field}>
            <label>Phone <span className={styles.optional}>(optional)</span></label>
            <input placeholder="Phone number"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label>Password *</label>
            <div className={styles.passwordWrap}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(s => !s)}>
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Confirm Password *</label>
            <div className={styles.passwordWrap}>
              <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(s => !s)}>
                {showConfirm ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.links}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
