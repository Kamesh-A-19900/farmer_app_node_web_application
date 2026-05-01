import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <p className={styles.logo}>AgriMarket</p>
          <p className={styles.tagline}>Connecting Farmers &amp; Customers directly</p>
        </div>
        <div className={styles.links}>
          {!user && (
            <>
              <a href="/">Home</a>
              <a href="/#about">About</a>
              <a href="/login">Login</a>
              <a href="/register">Register</a>
            </>
          )}
          {user && user.role !== 'admin' && (
            <>
              <a href={user.role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard'}>Dashboard</a>
              <a href="/chat">Chat</a>
              <button className={styles.logoutLink} onClick={handleLogout}>Sign Out</button>
            </>
          )}
          {user && user.role === 'admin' && (
            <button className={styles.logoutLink} onClick={handleLogout}>Sign Out</button>
          )}
        </div>
        <p className={styles.copy}>© {new Date().getFullYear()} AgriMarket. All rights reserved.</p>
      </div>
    </footer>
  );
}
