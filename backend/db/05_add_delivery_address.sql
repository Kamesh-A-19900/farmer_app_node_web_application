-- Add delivery address fields to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_name    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_phone   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_pincode VARCHAR(10);

-- Drop is_bidding column from products (no longer needed)
ALTER TABLE products DROP COLUMN IF EXISTS is_bidding;

-- Update process_order procedure to accept address
CREATE OR REPLACE PROCEDURE process_order(
  p_customer_id  INT,
  p_name         VARCHAR,
  p_phone        VARCHAR,
  p_address      TEXT,
  p_city         VARCHAR,
  p_pincode      VARCHAR
)
AS $$
DECLARE
  v_total    NUMERIC;
  v_order_id INT;
  v_delivery NUMERIC;
BEGIN
  SELECT SUM(p.price_per_kg * c.quantity) INTO v_total
  FROM cart c JOIN products p ON p.id = c.product_id
  WHERE c.customer_id = p_customer_id;

  IF v_total IS NULL OR v_total = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  v_delivery := CASE WHEN v_total < 500 THEN 50 WHEN v_total < 2000 THEN 30 ELSE 0 END;

  IF NOT validate_wallet_balance(p_customer_id, v_total + v_delivery) THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO orders(customer_id, total_amount, delivery_charge, delivery_name, delivery_phone, delivery_address, delivery_city, delivery_pincode)
  VALUES (p_customer_id, v_total, v_delivery, p_name, p_phone, p_address, p_city, p_pincode)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items(order_id, product_id, quantity, price)
  SELECT v_order_id, c.product_id, c.quantity, p.price_per_kg
  FROM cart c JOIN products p ON p.id = c.product_id
  WHERE c.customer_id = p_customer_id;

  UPDATE products SET quantity_kg = quantity_kg - c.quantity
  FROM cart c WHERE products.id = c.product_id AND c.customer_id = p_customer_id;

  DELETE FROM cart WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;
