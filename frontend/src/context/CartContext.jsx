import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  const refreshCount = async () => {
    try {
      const { data } = await api.get('/cart');
      setCartCount(data.length);
    } catch { setCartCount(0); }
  };

  return (
    <CartContext.Provider value={{ cartCount, refreshCount, setCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
