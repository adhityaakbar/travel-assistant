import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/scanner/history
router.get('/history', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, product_name, image_url, price_jpy, price_idr, indo_price_idr, savings_idr, outbound_url, created_at 
       FROM scan_history 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    res.json({ history: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat riwayat scan: ' + err.message });
  }
});

// POST /api/scanner/history
router.post('/history', async (req, res) => {
  try {
    const {
      product_name,
      image_url,
      price_jpy,
      price_idr,
      indo_price_idr,
      savings_idr,
      outbound_url
    } = req.body;

    const result = await query(
      `INSERT INTO scan_history (product_name, image_url, price_jpy, price_idr, indo_price_idr, savings_idr, outbound_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        product_name || 'Hasil Scan Price Tag',
        image_url || '',
        price_jpy || 0,
        price_idr || 0,
        indo_price_idr || 0,
        savings_idr || 0,
        outbound_url || ''
      ]
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan hasil scan: ' + err.message });
  }
});

export default router;
