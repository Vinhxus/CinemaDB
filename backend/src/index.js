const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/staff', require('./routes/staff'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api', require('./routes/lookups'));

// Kiểm tra kết nối DB: http://localhost:5000/api/health
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db, VERSION() AS version');
    res.json({ ok: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend chạy tại http://localhost:${PORT}`));
