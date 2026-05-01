import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onMessage, onBid, onCartAdd }) {
  const { user } = useAuth();
  const { refreshCount } = useCart();
  const navigate = useNavigate();
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qty, setQty] = useState(50);
  const [mode, setMode] = useState('cart'); // 'cart' | 'buy'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const maxQty = parseFloat(product.quantity_kg) || 9999;
  const minQty = 1;

  const openModal = (m) => {
    if (!user) return navigate('/login');
    if (user.role !== 'customer') return;
    setMode(m);
    setQty(1);
    setFeedback('');
    setShowQtyModal(true);
  };

  const confirmAdd = async () => {
    if (qty < minQty || qty > maxQty) {
      setFeedback(`Quantity must be between ${minQty} and ${maxQty} kg`);
      return;
    }
    setLoading(true);
    try {
      await api.post('/cart', { product_id: product.id, quantity: qty });
      refreshCount();
      onCartAdd?.(); // notify parent to refresh product list
      setFeedback('Added to cart successfully!');
      if (mode === 'buy') {
        setShowQtyModal(false);
        navigate('/customer/dashboard', { state: { tab: 'Cart' } });
      } else {
        setTimeout(() => setShowQtyModal(false), 900);
      }
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Failed to add to cart');
    }
    setLoading(false);
  };

  return (
    <>
      <div className={`card ${styles.card}`}>
        <div className={styles.imgWrap}>
          {product.image_base64 ? (
            <img src={product.image_base64} alt={product.name} className={styles.img} />
          ) : (
            <div className={styles.noImg}>No Image</div>
          )}
        </div>

        <div className={styles.body}>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.price}>Rs. {product.price_per_kg} <span>/kg</span></p>
          <p className={styles.qty}>{product.quantity_kg} kg available</p>
          <p className={styles.farmer}>
            Farmer: {product.farmer_name}
            {product.rating_avg > 0 && (
              <span className={styles.rating}> ★ {Number(product.rating_avg).toFixed(1)}</span>
            )}
          </p>
        </div>

        <div className={styles.actions}>
          {user?.role === 'customer' && (
            <>
              <button className={styles.cartBtn} onClick={() => openModal('cart')}>Add to Cart</button>
              <button className={styles.buyBtn} onClick={() => openModal('buy')}>Buy Now</button>
            </>
          )}
          {user?.role === 'customer' && (
            <button className={styles.msgBtn} onClick={() => onMessage?.(product.farmer_id)}>
              Message Farmer
            </button>
          )}
          {!user && (
            <button className={styles.buyBtn} onClick={() => navigate('/login')}>Login to Buy</button>
          )}
        </div>
      </div>

      {/* Quantity selection modal */}
      {showQtyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowQtyModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowQtyModal(false)}>×</button>
            <div className={styles.modalImg}>
              {product.image_base64
                ? <img src={product.image_base64} alt={product.name} />
                : <span>No Image</span>}
            </div>
            <h3 className={styles.modalTitle}>{product.name}</h3>
            <p className={styles.modalPrice}>Rs. {product.price_per_kg} / kg</p>
            <p className={styles.modalAvail}>Available: {maxQty} kg</p>

            <div className={styles.qtySection}>
              <label className={styles.qtyLabel}>Select Quantity (kg)</label>
              <div className={styles.qtyRow}>
                <button className={styles.qtyBtn}
                  onClick={() => setQty(q => Math.max(minQty, q - 10))}>−10</button>
                <button className={styles.qtyBtn}
                  onClick={() => setQty(q => Math.max(minQty, q - 1))}>−</button>
                <input
                  type="number"
                  className={styles.qtyInput}
                  value={qty}
                  min={minQty}
                  max={maxQty}
                  onChange={e => setQty(Math.max(minQty, Math.min(maxQty, Number(e.target.value))))}
                />
                <button className={styles.qtyBtn}
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}>+</button>
                <button className={styles.qtyBtn}
                  onClick={() => setQty(q => Math.min(maxQty, q + 10))}>+10</button>
              </div>
              <p className={styles.qtyHint}>Min: {minQty} kg · Max: {maxQty} kg available</p>
            </div>

            <div className={styles.modalTotal}>
              <span>Total</span>
              <strong>Rs. {(qty * product.price_per_kg).toFixed(2)}</strong>
            </div>

            {feedback && (
              <p className={feedback.includes('successfully') ? styles.feedbackOk : styles.feedbackErr}>
                {feedback}
              </p>
            )}

            <button
              className={styles.confirmBtn}
              onClick={confirmAdd}
              disabled={loading || qty < minQty || qty > maxQty}
            >
              {loading ? 'Adding...' : mode === 'buy' ? 'Buy Now' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
