// Mục 3.3: giao diện gọi thêm thủ tục (2.3 - P2) và hàm (2.4 - F2)
// TODO(Tài): tên/tham số phải khớp với SQL trong 03_procedures.sql và 04_functions.sql
const router = require('express').Router();
const { pool, callProc } = require('../db');
const { sendDbError } = require('../errors');

// GET /api/reports/review-stats?genreId=&fromDate=&minReviews=   -> sp_ReviewStatsByMovie (P2)
router.get('/review-stats', async (req, res) => {
  const { genreId, fromDate, minReviews } = req.query;
  if (minReviews !== undefined && minReviews !== '' && (!Number.isInteger(+minReviews) || +minReviews < 0)) {
    return res.status(400).json({ error: 'Số review tối thiểu phải là số nguyên không âm' });
  }
  try {
    const rows = await callProc('sp_ReviewStatsByMovie', [
      genreId ? Number(genreId) : null, fromDate || null, minReviews ? Number(minReviews) : 0,
    ]);
    res.json(rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/reports/check-combo/:bookingId   -> fn_CheckTicketCombo (F2)
router.get('/check-combo/:bookingId', async (req, res) => {
  const id = Number(req.params.bookingId);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mã booking phải là số nguyên dương' });
  try {
    const [rows] = await pool.query('SELECT fn_CheckTicketCombo(?) AS result', [id]);
    res.json({ result: rows[0].result });
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
