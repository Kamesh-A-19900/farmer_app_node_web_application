-- Migration script to fix database issues
-- Run: psql -U postgres -d agri_marketplace_db -f 04_migration_fixes.sql

-- Add bid_quantity column to bidding_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bidding_sessions' AND column_name = 'bid_quantity') THEN
        ALTER TABLE bidding_sessions ADD COLUMN bid_quantity NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bidding_sessions' AND column_name = 'created_at') THEN
        ALTER TABLE bidding_sessions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create bid_winners table if it doesn't exist
CREATE TABLE IF NOT EXISTS bid_winners (
  id              SERIAL PRIMARY KEY,
  session_id      INT NOT NULL REFERENCES bidding_sessions(id) ON DELETE CASCADE,
  customer_id     INT NOT NULL REFERENCES customers(customer_id),
  winning_amount  NUMERIC(10,2) NOT NULL,
  purchased       BOOLEAN DEFAULT FALSE,
  penalty_applied BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, customer_id)
);

-- Update existing bidding sessions to have proper bid_quantity
UPDATE bidding_sessions 
SET bid_quantity = (
  SELECT COALESCE(p.quantity_kg, 1) 
  FROM products p 
  WHERE p.id = bidding_sessions.product_id
)
WHERE bid_quantity = 0 OR bid_quantity IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bid_winners_session_customer ON bid_winners(session_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);