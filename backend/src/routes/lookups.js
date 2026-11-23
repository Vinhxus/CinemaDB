// Dữ liệu cho combobox (chỉ đọc)
const router = require('express').Router();
const { pool } = require('../db');
const { sendDbError } = require('../errors');

router.get('/cinemas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT CinemaID, CinemaName FROM Cinema ORDER BY CinemaName');
    res.json(rows);
  } catch (err) { sendDbError(res, err); }
});

// Manager đang Active của một rạp -> chọn người quản lý cho Cashier
router.get('/managers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.UserID, u.Name, s.Salary FROM Staff s JOIN Users u ON u.UserID = s.UserID
       WHERE s.Position = 'Manager' AND s.Status = 'Active' AND (? IS NULL OR s.CinemaID = ?)
       ORDER BY u.Name`, [req.query.cinemaId || null, req.query.cinemaId || null]);
    res.json(rows);
  } catch (err) { sendDbError(res, err); }
});

router.get('/genres', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT GenreID, GenreName FROM Genre ORDER BY GenreName');
    res.json(rows);
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
