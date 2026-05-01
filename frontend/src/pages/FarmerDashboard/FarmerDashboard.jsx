import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './FarmerDashboard.module.css';

const TABS = ['Products', 'Orders', 'Profile'];

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();

  const [tab, setTab] = useState(location.state?.tab || 'Products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  // Unread order badge — clears when farmer visits Orders tab
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [seenOrderCount, setSeenOrderCount] = useState(0);

  // Product form
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', quantity_kg: '', price_per_kg: '', image_base64: '' });

  const showMsg = useCallback((text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [prods, ordersRes, walletRes] = await Promise.all([
        api.get('/products'),
        api.get('/orders'),
        api.get('/wallet'),
      ]);
      const myProducts = prods.data.filter(p => p.farmer_id === user.userId);
      setProducts(myProducts);
      setOrders(ordersRes.data);
      setWallet(walletRes.data);
    } catch {}
  }, [user.userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (location.state?.tab) setTab(location.state.tab); }, [location.state]);

  // Clear badge when user visits Orders tab
  useEffect(() => {
    if (tab === 'Orders') {
      setSeenOrderCount(orders.length);
      setUnreadOrders(0);
    }
  }, [tab, orders.length]);

  // Show badge for new orders when not on Orders tab
  useEffect(() => {
    if (tab !== 'Orders' && orders.length > seenOrderCount) {
      setUnreadOrders(orders.length - seenOrderCount);
    }
  }, [orders.length, seenOrderCount, tab]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    const onNewOrder = () => fetchAll();
    socket.on('new_order', onNewOrder);
    return () => {
      socket.off('new_order', onNewOrder);
    };
  }, [socket, fetchAll]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMsg('Image must be under 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image_base64: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editId) {
        await api.put(`/products/${editId}`, payload);
        showMsg('Product updated successfully');
      } else {
        await api.post('/products', payload);
        showMsg('Product added successfully');
      }
      setForm({ name: '', quantity_kg: '', price_per_kg: '', image_base64: '' });
      setEditId(null);
      fetchAll();
    } catch (err) { showMsg(err.response?.data?.error || 'Error saving product', 'error'); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      showMsg('Product deleted');
      fetchAll();
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const earnings = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.farmerBadge}>
            <div className={styles.farmerAvatar}>{user.username?.[0]?.toUpperCase()}</div>
            <div>
              <p className={styles.farmerName}>{user.username}</p>
              <p className={styles.farmerId}>Farmer ID: #{user.userId}</p>
            </div>
          </div>
          <hr className={styles.divider} />
          {TABS.map(t => (
            <button key={t}
              className={`${styles.sideTab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}>
              {t}
              {t === 'Orders' && unreadOrders > 0 && (
                <span className={styles.tabBadge}>{unreadOrders}</span>
              )}
            </button>
          ))}
        </aside>

        <main className={styles.content}>
          {msg.text && (
            <div className={`${styles.msgBar} ${msg.type === 'error' ? styles.msgErr : styles.msgOk}`}>
              {msg.text}
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'Products' && (
            <div>
              <div className={styles.pageHeader}>
                <h2>{editId ? 'Edit Product' : 'My Products'}</h2>
                {editId && (
                  <button className={styles.cancelBtn}
                    onClick={() => { setEditId(null); setForm({ name:'',quantity_kg:'',price_per_kg:'',image_base64:'' }); }}>
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className={`card ${styles.formCard}`}>
                <h3 className={styles.formTitle}>{editId ? 'Edit Product' : 'Add New Product'}</h3>
                <form onSubmit={saveProduct} className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Product Name *</label>
                      <input placeholder="e.g. Organic Tomatoes" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Total Quantity (kg) *</label>
                      <input type="number" placeholder="e.g. 500" value={form.quantity_kg}
                        onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))} required min={1} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Price per kg (Rs.) *</label>
                      <input type="number" placeholder="e.g. 45" value={form.price_per_kg}
                        onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} required min={0.01} step="0.01" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Product Image</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                      {form.image_base64 && (
                        <img src={form.image_base64} alt="preview" className={styles.imgPreview} />
                      )}
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button className={styles.submitBtn} type="submit">
                      {editId ? 'Update Product' : 'Add Product'}
                    </button>
                  </div>
                </form>
              </div>

              <h3 className={styles.subTitle}>Listed Products ({products.length})</h3>
              <div className="grid-3">
                {products.map(p => (
                  <div key={p.id} className={`card ${styles.productCard}`}>
                    <div className={styles.productImgWrap}>
                      {p.image_base64
                        ? <img src={p.image_base64} alt={p.name} className={styles.productImg} />
                        : <div className={styles.productNoImg}>No Image</div>}
                    </div>
                    <div className={styles.productInfo}>
                      <p className={styles.productName}>{p.name}</p>
                      <p className={styles.productMeta}>Rs. {p.price_per_kg}/kg</p>
                      <p className={styles.productQty}>{p.quantity_kg} kg available</p>
                    </div>
                    <div className={styles.productActions}>
                      <button className={styles.editBtn}
                        onClick={() => {
                          setEditId(p.id);
                          setForm({ name: p.name, quantity_kg: p.quantity_kg, price_per_kg: p.price_per_kg, image_base64: p.image_base64 || '' });
                          window.scrollTo(0, 0);
                        }}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => deleteProduct(p.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <p className={styles.empty}>No products listed yet.</p>}
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'Orders' && (
            <div>
              <div className={styles.pageHeader}><h2>Orders Received</h2></div>
              <div className={styles.earningsGrid}>
                <div className={`card ${styles.earningsCard}`}>
                  <p className={styles.earningsLabel}>Total Earnings</p>
                  <p className={styles.earningsAmt}>Rs. {earnings.toFixed(2)}</p>
                </div>
                <div className={`card ${styles.earningsCard}`}>
                  <p className={styles.earningsLabel}>Wallet Balance</p>
                  <p className={styles.earningsAmt}>Rs. {parseFloat(wallet.balance).toFixed(2)}</p>
                </div>
                <div className={`card ${styles.earningsCard}`}>
                  <p className={styles.earningsLabel}>Total Orders</p>
                  <p className={styles.earningsAmt}>{orders.length}</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <p className={styles.empty}>No orders received yet.</p>
              ) : (
                <div className={styles.orderList}>
                  {orders.map(o => (
                    <div key={o.id} className={`card ${styles.orderCard}`}>
                      <div className={styles.orderHeader}>
                        <div>
                          <span className={styles.orderId}>Order #{o.id}</span>
                          <span className={styles.orderCustomer}>Customer: {o.customer_name}</span>
                        </div>
                        <div className={styles.orderRight}>
                          <span className={styles.orderDate}>
                            {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className={styles.orderStatus}>Completed</span>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      {o.delivery_address && (
                        <div className={styles.deliveryBox}>
                          <p className={styles.deliveryTitle}>📦 Deliver To</p>
                          <p className={styles.deliveryName}>{o.delivery_name} &nbsp;|&nbsp; 📞 {o.delivery_phone}</p>
                          <p className={styles.deliveryAddr}>
                            {o.delivery_address}, {o.delivery_city} — {o.delivery_pincode}
                          </p>
                        </div>
                      )}
                      <div className={styles.orderDetails}>
                        <h4>Order Details:</h4>
                        <div className={styles.orderSummary}>
                          <div className={styles.summaryRow}>
                            <span>Total Items:</span>
                            <strong>{(o.items || []).length} products</strong>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Total Weight:</span>
                            <strong>{(o.items || []).reduce((sum, item) => sum + parseFloat(item.quantity), 0).toFixed(2)} kg</strong>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Subtotal:</span>
                            <strong>Rs. {o.total_amount}</strong>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Delivery Charge:</span>
                            <strong>Rs. {o.delivery_charge}</strong>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Grand Total:</span>
                            <strong>Rs. {(parseFloat(o.total_amount) + parseFloat(o.delivery_charge)).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                      <table className={styles.orderTable}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity (kg)</th>
                            <th>Price/kg</th>
                            <th>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(o.items || []).map((item, i) => (
                            <tr key={i}>
                              <td className={styles.productName}>{item.name}</td>
                              <td className={styles.quantity}>{parseFloat(item.quantity).toFixed(2)} kg</td>
                              <td className={styles.price}>Rs. {parseFloat(item.price).toFixed(2)}</td>
                              <td className={styles.amount}>Rs. {(parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className={styles.orderFooter}>
                        <div className={styles.orderTotals}>
                          <span>Delivery Charge: Rs. {o.delivery_charge}</span>
                          <strong>Order Total: Rs. {(parseFloat(o.total_amount) + parseFloat(o.delivery_charge)).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {tab === 'Profile' && (
            <div>
              <div className={styles.pageHeader}><h2>My Profile</h2></div>
              <div className={`card ${styles.profileCard}`}>
                <div className={styles.profileTop}>
                  <div className={styles.profileAvatar}>{user.username?.[0]?.toUpperCase()}</div>
                  <div>
                    <h3 className={styles.profileName}>{user.username}</h3>
                    <p className={styles.profileRole}>Farmer</p>
                  </div>
                </div>
                <hr className={styles.divider} />
                <div className={styles.profileDetails}>
                  {[
                    ['Farmer ID', `#${user.userId}`, true],
                    ['Username', user.username, false],
                    ['Role', 'Farmer', false],
                    ['Wallet Balance', `Rs. ${parseFloat(wallet.balance).toFixed(2)}`, false],
                    ['Products Listed', products.length, false],
                    ['Total Orders', orders.length, false],
                  ].map(([label, value, highlight]) => (
                    <div key={label} className={styles.detailRow}>
                      <span>{label}</span>
                      <strong className={highlight ? styles.farmerIdHighlight : ''}>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className={styles.farmerIdNote}>
                  Your Farmer ID is <strong>#{user.userId}</strong> — use this to login
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
