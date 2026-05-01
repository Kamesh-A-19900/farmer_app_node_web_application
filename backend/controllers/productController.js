const pool = require('../config/db');

const getProducts = async (req, res, next) => {
  try {
    const { search, minPrice, maxPrice, sortBy, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `SELECT p.*, u.username as farmer_name, f.rating_avg
                 FROM products p
                 JOIN farmers f ON f.farmer_id = p.farmer_id
                 JOIN users u ON u.id = p.farmer_id
                 WHERE 1=1`;
    const params = [];
    if (search)   { params.push(`%${search}%`); query += ` AND p.name ILIKE $${params.length}`; }
    if (minPrice) { params.push(minPrice);       query += ` AND p.price_per_kg >= $${params.length}`; }
    if (maxPrice) { params.push(maxPrice);       query += ` AND p.price_per_kg <= $${params.length}`; }
    query += sortBy === 'price_asc'  ? ' ORDER BY p.price_per_kg ASC'
           : sortBy === 'price_desc' ? ' ORDER BY p.price_per_kg DESC'
           : ' ORDER BY p.created_at DESC';
    params.push(parseInt(limit), offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.username as farmer_name, f.rating_avg
       FROM products p
       JOIN farmers f ON f.farmer_id = p.farmer_id
       JOIN users u ON u.id = p.farmer_id
       WHERE p.id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, quantity_kg, price_per_kg, image_base64 } = req.body;
    const farmerId = req.user.userId;
    const { rows } = await pool.query(
      `INSERT INTO products (farmer_id, name, quantity_kg, price_per_kg, image_base64)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [farmerId, name, quantity_kg, price_per_kg, image_base64 || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { name, quantity_kg, price_per_kg, image_base64 } = req.body;
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, quantity_kg=$2, price_per_kg=$3,
       image_base64=COALESCE($4, image_base64)
       WHERE id=$5 AND farmer_id=$6 RETURNING *`,
      [name, quantity_kg, price_per_kg, image_base64, req.params.id, req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM products WHERE id=$1 AND farmer_id=$2`, [req.params.id, req.user.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
