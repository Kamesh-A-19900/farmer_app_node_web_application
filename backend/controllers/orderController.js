const pool = require('../config/db');
const { activeUsers } = require('../sockets/socketServer');

let _io = null;
const setIO = (io) => { _io = io; };

const createOrder = async (req, res, next) => {
  try {
    const { delivery_name, delivery_phone, delivery_address, delivery_city, delivery_pincode } = req.body;

    if (!delivery_name || !delivery_phone || !delivery_address || !delivery_city || !delivery_pincode) {
      return res.status(400).json({ error: 'Delivery address is required' });
    }

    await pool.query(
      `CALL process_order($1,$2,$3,$4,$5,$6)`,
      [req.user.userId, delivery_name, delivery_phone, delivery_address, delivery_city, delivery_pincode]
    );

    // Fetch the just-created order — use subquery to avoid GROUP BY issues
    const { rows: orderRows } = await pool.query(
      `SELECT o.id, o.total_amount, o.delivery_charge, o.created_at,
              u.username AS customer_name,
              (SELECT json_agg(json_build_object(
                'product_id', oi2.product_id,
                'name', p2.name,
                'quantity', oi2.quantity,
                'price', oi2.price,
                'farmer_id', p2.farmer_id
              ))
               FROM order_items oi2
               JOIN products p2 ON p2.id = oi2.product_id
               WHERE oi2.order_id = o.id
              ) AS items
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [req.user.userId]
    );

    if (orderRows.length && _io) {
      const order = orderRows[0];
      const farmerItems = {};
      (order.items || []).forEach(item => {
        if (!farmerItems[item.farmer_id]) farmerItems[item.farmer_id] = [];
        farmerItems[item.farmer_id].push(item);
      });

      Object.entries(farmerItems).forEach(([farmerId, items]) => {
        const farmerSocketId = activeUsers.get(parseInt(farmerId));
        const notification = {
          type: 'new_order',
          order_id: order.id,
          customer_name: order.customer_name,
          items,
          total: items.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.price), 0),
          created_at: order.created_at,
          message: `New order from ${order.customer_name}`,
        };
        if (farmerSocketId) {
          _io.to(farmerSocketId).emit('new_order', notification);
        }
        pool.query(
          `INSERT INTO logs (user_id, action, metadata) VALUES ($1, 'new_order', $2)`,
          [parseInt(farmerId), JSON.stringify(notification)]
        ).catch(() => {});
      });
    }

    res.status(201).json({ message: 'Order placed successfully', order_id: orderRows[0]?.id });
  } catch (err) {
    if (err.message?.includes('Insufficient') || err.message?.includes('empty')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    let rows;

    if (role === 'customer') {
      ({ rows } = await pool.query(
        `SELECT o.id, o.total_amount, o.delivery_charge, o.created_at, o.payment_method,
                (SELECT json_agg(json_build_object(
                  'product_id', oi.product_id,
                  'name', p.name,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'farmer_id', p.farmer_id
                ))
                 FROM order_items oi
                 JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = o.id
                ) AS items
         FROM orders o
         WHERE o.customer_id = $1
         ORDER BY o.created_at DESC`,
        [userId]
      ));
    } else {
      // Farmer: only orders that contain their products
      ({ rows } = await pool.query(
        `SELECT o.id, o.total_amount, o.delivery_charge, o.created_at,
                u.username AS customer_name,
                o.delivery_name, o.delivery_phone, o.delivery_address,
                o.delivery_city, o.delivery_pincode,
                (SELECT json_agg(json_build_object(
                  'product_id', oi2.product_id,
                  'name', p2.name,
                  'quantity', oi2.quantity,
                  'price', oi2.price
                ))
                 FROM order_items oi2
                 JOIN products p2 ON p2.id = oi2.product_id
                 WHERE oi2.order_id = o.id AND p2.farmer_id = $1
                ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         WHERE o.id IN (
           SELECT DISTINCT oi.order_id 
           FROM order_items oi 
           JOIN products p ON p.id = oi.product_id 
           WHERE p.farmer_id = $1
         )
         ORDER BY o.created_at DESC`,
        [userId]
      ));
    }
    res.json(rows);
  } catch (err) { next(err); }
};

const getOrderNotifications = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, metadata, timestamp FROM logs
       WHERE user_id=$1 AND action='new_order'
       ORDER BY timestamp DESC LIMIT 20`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const clearNotifications = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM logs WHERE user_id=$1 AND action='new_order'`, [req.user.userId]);
    res.json({ message: 'Notifications cleared' });
  } catch (err) { next(err); }
};

const getAuctionNotifications = async (req, res, next) => { res.json([]); };
const clearAuctionNotifications = async (req, res, next) => { res.json({ message: 'ok' }); };

module.exports = { createOrder, getOrders, getOrderNotifications, clearNotifications, getAuctionNotifications, clearAuctionNotifications, setIO };
