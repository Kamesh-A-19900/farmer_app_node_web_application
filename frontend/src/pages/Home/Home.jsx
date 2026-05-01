import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ProductCard from '../../components/ProductCard/ProductCard';
import api from '../../services/api';
import styles from './Home.module.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, []);

  const fetchProducts = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params });
      setProducts(data);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/products/stats');
      setStats(data);
    } catch {}
  };

  const handleSearch = () => {
    const params = {};
    if (search) params.search = search;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sortBy) params.sortBy = sortBy;
    fetchProducts(params);
  };

  const handleMessage = async (farmerId) => {
    try {
      await api.post('/chat/conversations', { other_user_id: farmerId });
      navigate('/chat');
    } catch { navigate('/login'); }
  };

  const formatStat = (n) => {
    const num = parseInt(n) || 0;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')}k+`;
    return num > 0 ? `${num}+` : '0';
  };

  const statItems = [
    { label: 'Farmers', value: stats ? formatStat(stats.totalUsers) : '—', icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )},
    { label: 'Products Listed', value: stats ? formatStat(stats.totalProducts) : '—', icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    )},
    { label: 'Orders Delivered', value: stats ? formatStat(stats.totalOrders) : '—', icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    )},
    { label: 'Revenue Generated', value: stats ? `₹${formatStat(stats.totalRevenue)}` : '—', icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    )},
  ];

  const features = [
    {
      title: 'Fresh Products',
      desc: 'Browse fresh agricultural products listed directly by local farmers — vegetables, fruits, grains, and more.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
    {
      title: 'Direct Communication',
      desc: 'Chat and call directly with farmers. Ask about produce quality, negotiate, and build lasting relationships.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      title: 'Secure Wallet',
      desc: 'Top up your wallet and pay instantly. All transactions are tracked with full history and transparent records.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
    },
    {
      title: 'Trusted Ratings',
      desc: 'Rate farmers after every purchase. Verified reviews help the community identify the best sellers.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
    {
      title: 'Delivery Included',
      desc: 'Delivery charges calculated automatically. Free delivery on orders above ₹2000.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.heroTag}>Farm to Table Marketplace</p>
          <h1 className={styles.heroTitle}>Fresh Produce,<br />Direct from Farmers</h1>
          <p className={styles.heroSub}>Buy directly from local farmers. No middlemen, fair prices, freshest produce.</p>
          <div className={styles.searchBar}>
            <input placeholder="Search products..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <input type="number" placeholder="Min ₹" value={minPrice}
              onChange={e => setMinPrice(e.target.value)} className={styles.priceInput} />
            <input type="number" placeholder="Max ₹" value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)} className={styles.priceInput} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
              <option value="">Sort by</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
            <button className={styles.searchBtn} onClick={handleSearch}>Search</button>
          </div>
        </div>
      </section>

      {/* Products */}
      <main className="container" style={{ padding: '40px 16px' }}>
        <h2 className={styles.sectionTitle}>Featured Products</h2>
        {loading ? (
          <div className={styles.loadingGrid}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : products.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-secondary)', marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>No products found.</p>
          </div>
        ) : (
          <div className="grid-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onMessage={handleMessage} onCartAdd={() => fetchProducts()} />
            ))}
          </div>
        )}
      </main>

      {/* Stats */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsGrid}>
            {statItems.map(s => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statIcon}>{s.icon}</div>
                <strong className={styles.statValue}>{s.value}</strong>
                <p className={styles.statLabel}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="about" className={styles.about}>
        <div className="container">
          <h2 className={styles.aboutTitle}>Why AgriMarket?</h2>
          <p className={styles.aboutLead}>
            A direct farm-to-table marketplace that eliminates middlemen,
            ensuring farmers get fair prices and customers receive the freshest produce.
          </p>
          <div className={`grid-3 ${styles.featureGrid}`}>
            {features.map(f => (
              <div key={f.title} className={`card ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
