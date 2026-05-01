-- agri_marketplace_db schema
-- Run: psql -U postgres -d agri_marketplace_db -f 01_schema.sql

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  role           VARCHAR(10) NOT NULL CHECK (role IN ('farmer','customer','admin')),
  username       VARCHAR(50) UNIQUE NOT NULL,
  phone          VARCHAR(20) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  wallet_balance NUMERIC(12,2) DEFAULT 0.00,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmers (
  farmer_id     INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating_avg    NUMERIC(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  farmer_id    INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  quantity_kg  NUMERIC(10,2) NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  image_base64 TEXT,
  is_bidding   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bidding_sessions (
  id           SERIAL PRIMARY KEY,
  product_id   INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  base_price   NUMERIC(10,2) NOT NULL,
  bid_quantity NUMERIC(10,2) NOT NULL,
  start_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time     TIMESTAMPTZ NOT NULL,
  status       VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
  id          SERIAL PRIMARY KEY,
  session_id  INT NOT NULL REFERENCES bidding_sessions(id) ON DELETE CASCADE,
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  bid_amount  NUMERIC(10,2) NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES customers(customer_id),
  total_amount    NUMERIC(12,2) NOT NULL,
  delivery_charge NUMERIC(8,2) DEFAULT 0.00,
  payment_method  VARCHAR(20) DEFAULT 'wallet',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity   NUMERIC(10,2) NOT NULL,
  price      NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS cart (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    NUMERIC(10,2) NOT NULL,
  UNIQUE(customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id          SERIAL PRIMARY KEY,
  farmer_id   INT NOT NULL REFERENCES farmers(farmer_id),
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  UNIQUE(farmer_id, customer_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES users(id),
  amount    NUMERIC(12,2) NOT NULL,
  type      VARCHAR(20) NOT NULL CHECK (type IN ('credit','debit','penalty')),
  status    VARCHAR(20) DEFAULT 'completed',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id),
  action    VARCHAR(100) NOT NULL,
  metadata  JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  user1_id   INT NOT NULL REFERENCES users(id),
  user2_id   INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INT NOT NULL REFERENCES users(id),
  message_text    TEXT,
  message_type    VARCHAR(10) DEFAULT 'text' CHECK (message_type IN ('text','image')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  seen_status     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS call_logs (
  id          SERIAL PRIMARY KEY,
  caller_id   INT NOT NULL REFERENCES users(id),
  receiver_id INT NOT NULL REFERENCES users(id),
  call_type   VARCHAR(10) NOT NULL CHECK (call_type IN ('audio','video')),
  start_time  TIMESTAMPTZ,
  end_time    TIMESTAMPTZ,
  status      VARCHAR(10) DEFAULT 'missed' CHECK (status IN ('missed','answered','rejected'))
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id         SERIAL PRIMARY KEY,
  phone      VARCHAR(20) NOT NULL,
  otp_code   VARCHAR(6) NOT NULL,
  purpose    VARCHAR(20) NOT NULL CHECK (purpose IN ('register','reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE
);
