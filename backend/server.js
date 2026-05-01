require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initSocket } = require('./sockets/socketServer');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Allow all origins (CORS)
app.use(cors({ origin: true, credentials: true }));

const io = new Server(server, {
  cors: { origin: '*', credentials: false },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check for Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/admin', require('./routes/admin'));

// Socket.IO
initSocket(io);

const { setIO } = require('./controllers/orderController');
setIO(io);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    require('./scripts/migrate')()
      .then(() => require('./scripts/createAdmin')())
      .catch(console.error);
  }
});
