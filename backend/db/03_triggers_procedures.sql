-- Functions
CREATE OR REPLACE FUNCTION calculate_highest_bid(p_session_id INT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(MAX(bid_amount), 0) FROM bids WHERE session_id = p_session_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION validate_wallet_balance(p_user_id INT, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
  SELECT wallet_balance >= p_amount FROM users WHERE id = p_user_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION calculate_delivery_charge(p_order_id INT)
RETURNS NUMERIC AS $$
DECLARE v_total NUMERIC;
BEGIN
  SELECT total_amount INTO v_total FROM orders WHERE id = p_order_id;
  RETURN CASE WHEN v_total < 500 THEN 50 WHEN v_total < 2000 THEN 30 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Bid penalty on session close
CREATE OR REPLACE FUNCTION apply_bid_penalty_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'active' THEN
    UPDATE users u
    SET wallet_balance = wallet_balance - (
      SELECT bid_amount * 0.05 FROM bids
      WHERE session_id = NEW.id AND customer_id = u.id
      ORDER BY timestamp DESC LIMIT 1
    )
    WHERE u.id IN (
      SELECT DISTINCT b.customer_id FROM bids b
      WHERE b.session_id = NEW.id
        AND b.customer_id != (
          SELECT customer_id FROM bids WHERE session_id = NEW.id
          ORDER BY bid_amount DESC LIMIT 1
        )
    );
    INSERT INTO wallet_transactions (user_id, amount, type, status)
    SELECT DISTINCT b.customer_id,
      (SELECT bid_amount * 0.05 FROM bids WHERE session_id=NEW.id AND customer_id=b.customer_id ORDER BY timestamp DESC LIMIT 1),
      'penalty', 'completed'
    FROM bids b
    WHERE b.session_id = NEW.id
      AND b.customer_id != (SELECT customer_id FROM bids WHERE session_id=NEW.id ORDER BY bid_amount DESC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bid_penalty ON bidding_sessions;
CREATE TRIGGER trg_bid_penalty
BEFORE UPDATE ON bidding_sessions
FOR EACH ROW EXECUTE FUNCTION apply_bid_penalty_trigger();

-- Trigger: Deduct wallet on order
CREATE OR REPLACE FUNCTION deduct_wallet_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET wallet_balance = wallet_balance - (NEW.total_amount + NEW.delivery_charge)
  WHERE id = NEW.customer_id;
  INSERT INTO wallet_transactions(user_id, amount, type, status)
  VALUES (NEW.customer_id, NEW.total_amount + NEW.delivery_charge, 'debit', 'completed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_deduct ON orders;
CREATE TRIGGER trg_wallet_deduct
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION deduct_wallet_on_order();

-- Trigger: Credit farmer on order item
CREATE OR REPLACE FUNCTION credit_farmer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users u SET wallet_balance = wallet_balance + (NEW.price * NEW.quantity)
  FROM products p
  WHERE p.id = NEW.product_id AND u.id = p.farmer_id;
  INSERT INTO wallet_transactions(user_id, amount, type, status)
  SELECT p.farmer_id, NEW.price * NEW.quantity, 'credit', 'completed'
  FROM products p WHERE p.id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farmer_credit ON order_items;
CREATE TRIGGER trg_farmer_credit
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION credit_farmer_on_order();

-- Trigger: Update farmer rating
CREATE OR REPLACE FUNCTION update_farmer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE farmers
  SET rating_avg = (SELECT AVG(rating) FROM ratings WHERE farmer_id = NEW.farmer_id),
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE farmer_id = NEW.farmer_id)
  WHERE farmer_id = NEW.farmer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rating_update ON ratings;
CREATE TRIGGER trg_rating_update
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_farmer_rating();

-- Function: Auto-close expired sessions
CREATE OR REPLACE FUNCTION close_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE bidding_sessions SET status = 'closed'
  WHERE status = 'active' AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Procedures
CREATE OR REPLACE PROCEDURE place_bid(p_customer_id INT, p_session_id INT, p_amount NUMERIC)
AS $$
DECLARE v_highest NUMERIC;
BEGIN
  SELECT calculate_highest_bid(p_session_id) INTO v_highest;
  IF p_amount <= v_highest THEN
    RAISE EXCEPTION 'Bid must exceed current highest bid of %', v_highest;
  END IF;
  IF NOT validate_wallet_balance(p_customer_id, p_amount * 0.05) THEN
    RAISE EXCEPTION 'Insufficient wallet balance for bid penalty reserve';
  END IF;
  INSERT INTO bids(session_id, customer_id, bid_amount) VALUES (p_session_id, p_customer_id, p_amount);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE process_order(p_customer_id INT)
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

  INSERT INTO orders(customer_id, total_amount, delivery_charge)
  VALUES (p_customer_id, v_total, v_delivery) RETURNING id INTO v_order_id;

  INSERT INTO order_items(order_id, product_id, quantity, price)
  SELECT v_order_id, c.product_id, c.quantity, p.price_per_kg
  FROM cart c JOIN products p ON p.id = c.product_id
  WHERE c.customer_id = p_customer_id;

  -- Reduce product quantity after purchase
  UPDATE products SET quantity_kg = quantity_kg - c.quantity
  FROM cart c WHERE products.id = c.product_id AND c.customer_id = p_customer_id;

  DELETE FROM cart WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;
