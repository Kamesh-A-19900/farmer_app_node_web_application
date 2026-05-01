# Agricultural Marketplace Platform

A comprehensive agricultural marketplace connecting farmers and customers with real-time features, bidding system, and professional interface.

## Recent Updates & Fixes

### Database Issues Fixed
- Added missing `bid_quantity` column to `bidding_sessions` table
- Created missing `bid_winners` table for auction results  
- Fixed GROUP BY SQL errors in order queries
- Added proper database indexes for performance

### UI/UX Improvements
- Enhanced order details display for farmers with quantity breakdowns
- Removed unnecessary emoji icons for professional appearance
- Improved order summary with total weight and item counts
- Better styling for order tables and summaries
- Professional product cards without emoji clutter

### State Management & Functionality
- Proper async/await handling in cart operations
- Automatic refresh after order placement
- Better error handling with user feedback
- Consistent state updates across components
- Fixed bidding system with proper quantity management

## Tech Stack
- **Frontend**: React 18 + Vite, React Router v6, Socket.IO Client, WebRTC
- **Backend**: Node.js, Express 4, Socket.IO
- **Database**: PostgreSQL 15

## Quick Start

### 1. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE agri_marketplace_db;"

# Run setup script (includes all fixes)
cd backend/db
chmod +x setup.sh
DB_USER=postgres ./setup.sh
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env   # edit with your DB credentials
npm install
npm run dev            # runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

## Key Features

### For Farmers
- **Product Management**: Add, edit, manage agricultural products
- **Auction System**: Create bidding sessions with quantity selection
- **Order Management**: Detailed order view with customer info and quantities
- **Real-time Notifications**: Get notified of new orders instantly
- **Wallet System**: Track earnings and transactions
- **Professional Dashboard**: Clean interface without unnecessary icons

### For Customers  
- **Product Browsing**: Search and filter products
- **Shopping Cart**: Add products with custom quantities
- **Live Bidding**: Participate in real-time auctions
- **Order Tracking**: View detailed order history
- **Wallet Management**: Top up and track transactions
- **Real-time Updates**: Bidding and order notifications

### Technical Features
- JWT authentication with bcrypt + OTP phone verification
- Real-time chat (Socket.IO) with typing indicators
- WebRTC audio/video calls
- Live bidding with 5% penalty enforcement
- Professional UI without emoji clutter
- Proper state management with React hooks

## Routes
| Path | Description |
|------|-------------|
| `/` | Home — product listing + search |
| `/login` | Login (role selection) |
| `/register` | Register + OTP verify |
| `/forgot-password` | Password reset |
| `/farmer/dashboard` | Farmer dashboard |
| `/customer/dashboard` | Customer dashboard |
| `/chat` | Real-time chat |
| `/call` | Audio/Video call (WebRTC) |
| `/admin-secret-dashboard` | Admin panel (hidden) |

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agri_marketplace_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Database Schema Highlights

### Key Tables
- `users` - User accounts with wallet balance
- `products` - Agricultural products with quantity tracking
- `bidding_sessions` - Auctions with bid_quantity column
- `bid_winners` - Auction results with penalty tracking
- `orders` - Customer orders with detailed items
- `order_items` - Individual products in orders
- `wallet_transactions` - Financial transaction history

## Testing
```bash
cd backend
npm test  # Run property-based tests
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Products & Orders
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (farmers)
- `GET /api/orders` - Get user orders (with proper GROUP BY fix)
- `POST /api/orders` - Create order from cart

### Bidding System
- `GET /api/bidding` - Get active auctions
- `POST /api/bidding` - Start auction (farmers)
- `POST /api/bidding/bid` - Place bid
- `POST /api/bidding/confirm-purchase` - Confirm auction win

### Cart & Wallet
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `GET /api/wallet` - Get wallet balance & transactions
- `POST /api/wallet/topup` - Add money to wallet
