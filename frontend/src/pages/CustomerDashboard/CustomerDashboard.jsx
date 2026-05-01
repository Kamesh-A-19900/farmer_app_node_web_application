import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ProductCard from '../../components/ProductCard/ProductCard';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import styles from './CustomerDashboard.module.css';

const TABS = ['Products', 'Cart', 'Orders', 'Profile'];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { refreshCount } = useCart();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState(location.state?.tab || 'Products');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [topupAmt, setTopupAmt] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState({
    delivery_name: '', delivery_phone: '', delivery_address: '',
    delivery_city: '', delivery_pincode: ''
  });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state]);

  // Socket: real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.on('new_order', () => fetchAll());
    return () => {
      socket.off('new_order');
    };
  }, [socket]);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  };

  const fetchAll = async () => {
    try {
      const [p, c, o, w] = await Promise.all([
        api.get('/products'),
        api.get('/cart'),
        api.get('/orders'),
        api.get('/wallet'),
      ]);
      setProducts(p.data);
      setCart(c.data);
      setOrders(o.data);
      setWallet(w.data);
      refreshCount();
    } catch {}
  };

  const handleTopup = async () => {
    if (!topupAmt || topupAmt <= 0) return;
    try {
      await api.post('/wallet/topup', { amount: parseFloat(topupAmt) });
      showMsg(`₹${topupAmt} added to wallet!`);
      setTopupAmt('');
      fetchAll();
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const updateCartQty = async (id, qty) => {
    if (qty < 1) {
      if (window.confirm('Remove this item from cart?')) {
        try {
          await api.delete(`/cart/${id}`);
          await fetchAll();
        } catch (err) {
          showMsg('Error removing item', 'error');
        }
      }
      return;
    }
    try {
      await api.put(`/cart/${id}`, { quantity: qty });
      await fetchAll();
    } catch (err) {
      showMsg('Error updating quantity', 'error');
    }
  };

  const removeCartItem = async (id) => {
    try {
      await api.delete(`/cart/${id}`);
      await fetchAll();
    } catch (err) {
      showMsg('Error removing item', 'error');
    }
  };

  const checkout = async () => {
    // Validate min 50kg total
    const totalKg = cart.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
    if (totalKg < 50) {
      showMsg(`Minimum order is 50 kg. You have ${totalKg.toFixed(1)} kg in cart.`, 'error');
      return;
    }
    if (!address.delivery_name || !address.delivery_phone || !address.delivery_address || !address.delivery_city || !address.delivery_pincode) {
      showMsg('Please fill in all delivery address fields', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/orders', address);
      showMsg('🎉 Order placed successfully!');
      setShowAddressForm(false);
      setAddress({ delivery_name: '', delivery_phone: '', delivery_address: '', delivery_city: '', delivery_pincode: '' });
      await fetchAll();
      setTab('Orders');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Checkout failed', 'error');
    }
    setLoading(false);
  };

  const handleMessage = async (farmerId) => {
    try {
      await api.post('/chat/conversations', { other_user_id: farmerId });
      navigate('/chat');
    } catch { navigate('/login'); }
  };

  const submitRating = async () => {
    if (!ratingModal) return;
    try {
      await api.post('/ratings', { farmer_id: ratingModal.farmerId, rating: ratingVal, review: ratingReview });
      showMsg('⭐ Rating submitted!');
      setRatingModal(null);
      setRatingVal(5);
      setRatingReview('');
      fetchAll();
    } catch (err) { showMsg(err.response?.data?.error || 'Failed to submit rating', 'error'); }
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price_per_kg) * parseFloat(item.quantity), 0);
  const cartTotalKg = cart.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
  const delivery = cartTotal < 500 ? 50 : cartTotal < 2000 ? 30 : 0;

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.layout}>
        {/* Sidebar tabs */}
        <aside className={styles.sidebar}>
          {TABS.map(t => (
            <button key={t}
              className={`${styles.sideTab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}>
              {t}
              {t === 'Cart' && cart.length > 0 && <span className={styles.tabBadge}>{cart.length}</span>}
            </button>
          ))}
        </aside>

        <main className={styles.content}>
          {msg.text && (
            <div className={`${styles.msgBar} ${msg.type === 'error' ? styles.msgErr : styles.msgOk}`}>
              {msg.text}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'Products' && (
            <div>
              <div className={styles.pageHeader}>
                <h2>Browse Products</h2>
                <input className={styles.searchInput} placeholder="Search products..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="grid-4">
                {products
                  .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                  .map(p => (
                    <ProductCard key={p.id} product={p} onMessage={handleMessage} onCartAdd={fetchAll} />
                  ))}
                {products.length === 0 && <p className={styles.empty}>No products available.</p>}
              </div>
            </div>
          )}

          {/* ── CART ── */}
          {tab === 'Cart' && (
            <div>
              <div className={styles.pageHeader}><h2>My Cart</h2></div>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>Your cart is empty</p>
                  <button className="btn btn-primary" onClick={() => setTab('Products')}>Browse Products</button>
                </div>
              ) : (
                <div className={styles.cartLayout}>
                  <div className={styles.cartItems}>
                    {cart.map(item => (
                      <div key={item.id} className={`card ${styles.cartRow}`}>
                        <div className={styles.cartImg}>
                          {item.image_base64
                            ? <img src={item.image_base64} alt={item.name} />
                            : <span>🌾</span>}
                        </div>
                        <div className={styles.cartInfo}>
                          <p className={styles.cartName}>{item.name}</p>
                          <p className={styles.cartPrice}>₹{item.price_per_kg}/kg</p>
                        </div>
                        <div className={styles.cartQtyCtrl}>
                          <button onClick={() => updateCartQty(item.id, Math.max(1, parseFloat(item.quantity) - 10))}>−10</button>
                          <button onClick={() => updateCartQty(item.id, Math.max(1, parseFloat(item.quantity) - 1))}>−</button>
                          <span className={styles.cartQtyVal}>{item.quantity} kg</span>
                          <button onClick={() => updateCartQty(item.id, parseFloat(item.quantity) + 1)}>+</button>
                          <button onClick={() => updateCartQty(item.id, parseFloat(item.quantity) + 10)}>+10</button>
                        </div>
                        <p className={styles.cartItemTotal}>
                          ₹{(parseFloat(item.price_per_kg) * parseFloat(item.quantity)).toFixed(2)}
                        </p>
                        <button className={styles.removeBtn} onClick={() => removeCartItem(item.id)}>✕</button>
                      </div>
                    ))}
                  </div>

                  <div className={`card ${styles.cartSummary}`}>
                    <h3 className={styles.summaryTitle}>Order Summary</h3>
                    <div className={styles.summaryRow}>
                      <span>Subtotal ({cart.length} items)</span>
                      <span>₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Total Weight</span>
                      <span className={cartTotalKg < 50 ? styles.walletLow : styles.walletOk}>
                        {cartTotalKg.toFixed(1)} kg {cartTotalKg < 50 ? `(min 50 kg)` : '✓'}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Delivery</span>
                      <span className={delivery === 0 ? styles.free : ''}>
                        {delivery === 0 ? 'FREE' : `₹${delivery}`}
                      </span>
                    </div>
                    {delivery > 0 && (
                      <p className={styles.freeDeliveryHint}>
                        Add ₹{(2000 - cartTotal).toFixed(0)} more for free delivery
                      </p>
                    )}
                    <hr className={styles.summaryDivider} />
                    <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                      <span>Total</span>
                      <span>₹{(cartTotal + delivery).toFixed(2)}</span>
                    </div>
                    <div className={styles.walletInfo}>
                      <span>💰 Wallet Balance</span>
                      <span className={parseFloat(wallet.balance) >= cartTotal + delivery ? styles.walletOk : styles.walletLow}>
                        ₹{parseFloat(wallet.balance).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(wallet.balance) < cartTotal + delivery && (
                      <p className={styles.walletWarning}>
                        ⚠️ Insufficient balance. <button className={styles.topupLink} onClick={() => setTab('Profile')}>Top up wallet</button>
                      </p>
                    )}

                    {/* Address Form */}
                    {showAddressForm && (
                      <div className={styles.addressForm}>
                        <h4 className={styles.addressTitle}>📦 Delivery Address</h4>
                        <div className={styles.addrGrid}>
                          <div className={styles.addrField}>
                            <label>Full Name *</label>
                            <input placeholder="Recipient name" value={address.delivery_name}
                              onChange={e => setAddress(a => ({ ...a, delivery_name: e.target.value }))} />
                          </div>
                          <div className={styles.addrField}>
                            <label>Phone *</label>
                            <input placeholder="10-digit mobile" value={address.delivery_phone}
                              onChange={e => setAddress(a => ({ ...a, delivery_phone: e.target.value }))} />
                          </div>
                          <div className={`${styles.addrField} ${styles.addrFull}`}>
                            <label>Address *</label>
                            <textarea placeholder="House no, Street, Area" rows={2}
                              value={address.delivery_address}
                              onChange={e => setAddress(a => ({ ...a, delivery_address: e.target.value }))} />
                          </div>
                          <div className={styles.addrField}>
                            <label>City *</label>
                            <input placeholder="City" value={address.delivery_city}
                              onChange={e => setAddress(a => ({ ...a, delivery_city: e.target.value }))} />
                          </div>
                          <div className={styles.addrField}>
                            <label>Pincode *</label>
                            <input placeholder="6-digit pincode" value={address.delivery_pincode}
                              onChange={e => setAddress(a => ({ ...a, delivery_pincode: e.target.value }))} />
                          </div>
                        </div>
                        <div className={styles.addrActions}>
                          <button className={styles.checkoutBtn} onClick={checkout}
                            disabled={loading || parseFloat(wallet.balance) < cartTotal + delivery || cartTotalKg < 50}>
                            {loading ? 'Processing...' : '✅ Confirm Order'}
                          </button>
                          <button className={styles.cancelAddrBtn} onClick={() => setShowAddressForm(false)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {!showAddressForm && (
                      <button
                        className={styles.checkoutBtn}
                        onClick={() => setShowAddressForm(true)}
                        disabled={parseFloat(wallet.balance) < cartTotal + delivery || cartTotalKg < 50}
                      >
                        Proceed to Checkout
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'Orders' && (
            <div>
              <div className={styles.pageHeader}><h2>My Orders</h2></div>
              {orders.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>No orders yet</p>
                  <button className="btn btn-primary" onClick={() => setTab('Products')}>Start Shopping</button>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className={`card ${styles.orderCard}`}>
                    <div className={styles.orderHeader}>
                      <span className={styles.orderId}>Order #{o.id}</span>
                      <span className={styles.orderDate}>{new Date(o.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                      <span className={styles.orderStatus}>Confirmed</span>
                    </div>
                    <div className={styles.orderSummary}>
                      <div className={styles.summaryRow}>
                        <span>Total Items:</span>
                        <strong>{(o.items || []).length} products</strong>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>Total Weight:</span>
                        <strong>{(o.items || []).reduce((sum, item) => sum + parseFloat(item.quantity), 0).toFixed(2)} kg</strong>
                      </div>
                    </div>
                    {o.items && o.items.map((item, i) => (
                      <div key={i} className={styles.orderItem}>
                        <div className={styles.itemDetails}>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={styles.itemQty}>{parseFloat(item.quantity).toFixed(2)} kg × Rs. {parseFloat(item.price).toFixed(2)}/kg</span>
                        </div>
                        <span className={styles.itemTotal}>Rs. {(parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className={styles.orderFooter}>
                      <div className={styles.orderTotals}>
                        <span>Delivery: Rs. {o.delivery_charge}</span>
                        <strong>Total: Rs. {(parseFloat(o.total_amount) + parseFloat(o.delivery_charge)).toFixed(2)}</strong>
                      </div>
                    </div>
                    {o.items && [...new Map(o.items.map(i => [i.farmer_id, i])).values()].map(item => (
                      <button key={item.farmer_id} className={styles.rateBtn}
                        onClick={() => { setRatingModal({ farmerId: item.farmer_id, farmerName: item.name }); setRatingVal(5); setRatingReview(''); }}>
                        Rate Farmer
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === 'Profile' && (
            <div>
              <div className={styles.pageHeader}><h2>My Profile</h2></div>
              <div className={styles.profileGrid}>
                <div className={`card ${styles.profileCard}`}>
                  <div className={styles.profileAvatar}>{user.username?.[0]?.toUpperCase()}</div>
                  <h3 className={styles.profileName}>{user.username}</h3>
                  <p className={styles.profileRole}>Customer</p>
                </div>

                <div className={`card ${styles.walletCard}`}>
                  <h3>💰 Wallet</h3>
                  <p className={styles.walletBal}>₹{parseFloat(wallet.balance).toFixed(2)}</p>
                  <div className={styles.topupRow}>
                    <input type="number" placeholder="Amount" value={topupAmt}
                      onChange={e => setTopupAmt(e.target.value)} min={1} />
                    <button className="btn btn-primary" onClick={handleTopup}>Add Money</button>
                  </div>
                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>Recent Transactions</h4>
                  <div className={styles.txnList}>
                    {wallet.transactions.slice(0, 10).map(t => (
                      <div key={t.id} className={styles.txnRow}>
                        <span className={`${styles.txnType} ${styles[t.type]}`}>
                          {t.type === 'credit' ? '↑' : '↓'} {t.type}
                        </span>
                        <span className={t.type === 'credit' ? styles.txnCredit : styles.txnDebit}>
                          {t.type === 'credit' ? '+' : '-'}₹{t.amount}
                        </span>
                        <span className={styles.txnDate}>{new Date(t.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {wallet.transactions.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />

      {/* Rating Modal */}
      {ratingModal && (
        <div className={styles.modalOverlay} onClick={() => setRatingModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setRatingModal(null)}>✕</button>
            <h3 style={{ marginBottom: 12 }}>Rate Farmer</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)}
                  style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer',
                    color: star <= ratingVal ? '#f59e0b' : '#d1d5db' }}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Write a review (optional)..."
              value={ratingReview}
              onChange={e => setRatingReview(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 12, resize: 'vertical' }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitRating}>
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
