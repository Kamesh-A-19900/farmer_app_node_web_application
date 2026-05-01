import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import NotificationBell from '../NotificationBell/NotificationBell';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropRef = useRef(null);

  const handleLogout = () => { setProfileOpen(false); setMenuOpen(false); logout(); navigate('/'); };

  const dashboardPath = user?.role === 'farmer'
    ? '/farmer/dashboard'
    : user?.role === 'admin'
    ? '/admin-secret-dashboard'
    : '/customer/dashboard';

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link to={user ? dashboardPath : '/'} className={styles.logo}>AgriMarket</Link>

        {/* Desktop links */}
        <div className={styles.links}>
          {!user && (
            <>
              <Link to="/" className={location.pathname === '/' ? styles.activeLink : styles.navLink}>Home</Link>
              <a href="/#about" className={styles.navLink}>About</a>
            </>
          )}

          {user && user.role !== 'admin' && (
            <>
              <Link to={dashboardPath} className={styles.navLink}>
                {user.role === 'farmer' ? 'My Farm' : 'Shop'}
              </Link>
              <Link to="/chat" className={styles.navLink}>Chat</Link>
              {user.role === 'customer' && (
                <button className={styles.cartBtn}
                  onClick={() => navigate('/customer/dashboard', { state: { tab: 'Cart' } })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  Cart
                  {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                </button>
              )}
              {user.role === 'farmer' && <NotificationBell />}
            </>
          )}

          {user ? (
            <div className={styles.profileWrap} ref={dropRef}>
              <button className={styles.profileBtn} onClick={() => setProfileOpen(o => !o)}>
                <span className={styles.avatar}>{user.username?.[0]?.toUpperCase()}</span>
                <span className={styles.username}>{user.username}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <polyline points={profileOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                </svg>
              </button>
              {profileOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropHeader}>
                    <span className={styles.dropAvatar}>{user.username?.[0]?.toUpperCase()}</span>
                    <div>
                      <p className={styles.dropName}>{user.username}</p>
                      <p className={styles.dropRole}>
                        {user.role === 'farmer' ? 'Farmer' : user.role === 'admin' ? 'Administrator' : 'Customer'}
                      </p>
                    </div>
                  </div>
                  <hr className={styles.dropDivider} />
                  {user.role !== 'admin' && (
                    <>
                      <Link to={dashboardPath} className={styles.dropItem} onClick={() => setProfileOpen(false)}>Dashboard</Link>
                      <Link to={dashboardPath} state={{ tab: 'Profile' }} className={styles.dropItem} onClick={() => setProfileOpen(false)}>My Profile</Link>
                      {user.role === 'customer' && (
                        <Link to="/customer/dashboard" state={{ tab: 'Orders' }} className={styles.dropItem} onClick={() => setProfileOpen(false)}>My Orders</Link>
                      )}
                      <hr className={styles.dropDivider} />
                    </>
                  )}
                  <button className={styles.dropLogout} onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authBtns}>
              <Link to="/login"><button className={styles.loginBtn}>Login</button></Link>
              <Link to="/register"><button className={styles.registerBtn}>Register</button></Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className={styles.hamburger} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {!user && (
            <>
              <Link to="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Home</Link>
              <a href="/#about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>About</a>
              <Link to="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className={styles.mobileLinkPrimary} onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
          {user && user.role !== 'admin' && (
            <>
              <Link to={dashboardPath} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                {user.role === 'farmer' ? 'My Farm' : 'Shop'}
              </Link>
              <Link to="/chat" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Chat</Link>
              {user.role === 'customer' && (
                <button className={styles.mobileLink} onClick={() => { navigate('/customer/dashboard', { state: { tab: 'Cart' } }); setMenuOpen(false); }}>
                  Cart {cartCount > 0 && `(${cartCount})`}
                </button>
              )}
            </>
          )}
          {user && (
            <button className={styles.mobileLinkDanger} onClick={handleLogout}>Sign Out</button>
          )}
        </div>
      )}
    </nav>
  );
}
