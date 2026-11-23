// Backend Express. Thêm/sửa/xóa đều gọi stored procedure (đề bắt buộc), không dùng ORM.
const express = require('express')
const cors = require('cors')
const { pool, callProc, sendError } = require('./db')

const app = express()
app.use(cors())
app.use(express.json())

const orNull = (v) => (v === undefined || v === '' ? null : v)

// Kiểm tra kết nối: http://localhost:5000/api/health
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db, VERSION() AS version')
    res.json({ ok: true, ...rows[0] })
  } catch (err) { sendError(res, err) }
})

// ===================== NHÂN VIÊN (mục 3.1, 3.2) =====================

// Danh sách -> sp_ListStaff (P1, mục 2.3)
app.get('/api/staff', async (req, res) => {
  const { keyword, cinemaId, position, status, sortBy } = req.query
  try {
    const rows = await callProc('sp_ListStaff', [
      orNull(keyword), cinemaId ? Number(cinemaId) : null, orNull(position), orNull(status), sortBy || 'name',
    ])
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

// Lấy 1 nhân viên để đổ vào form sửa
app.get('/api/staff/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.UserID, u.Name, u.BirthDate, u.Email, u.Phone, s.StartDate, s.Salary,
              s.Status, s.Position, s.CinemaID, s.SupervisorID
       FROM Staff s JOIN Users u ON u.UserID = s.UserID WHERE s.UserID = ?`, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy nhân viên' })
    res.json(rows[0])
  } catch (err) { sendError(res, err) }
})

// Thêm -> sp_InsertStaff
app.post('/api/staff', async (req, res) => {
  const b = req.body
  try {
    const rows = await callProc('sp_InsertStaff', [
      b.name, orNull(b.birthDate), b.email, b.phone, b.password,
      orNull(b.startDate), orNull(b.salary), b.position, orNull(b.cinemaId), orNull(b.supervisorId),
    ])
    res.status(201).json({ message: 'Thêm nhân viên thành công', userId: rows[0]?.NewUserID })
  } catch (err) { sendError(res, err) }
})

// Sửa -> sp_UpdateStaff
app.put('/api/staff/:id', async (req, res) => {
  const b = req.body
  try {
    await callProc('sp_UpdateStaff', [
      Number(req.params.id), b.name, orNull(b.birthDate), b.email, b.phone,
      orNull(b.startDate), orNull(b.salary), b.position, b.status, orNull(b.cinemaId), orNull(b.supervisorId),
    ])
    res.json({ message: 'Cập nhật nhân viên thành công' })
  } catch (err) { sendError(res, err) }
})

// Xóa -> sp_DeleteStaff
app.delete('/api/staff/:id', async (req, res) => {
  try {
    await callProc('sp_DeleteStaff', [Number(req.params.id)])
    res.json({ message: 'Đã xóa nhân viên' })
  } catch (err) { sendError(res, err) }
})

// ===================== DỮ LIỆU CHO COMBOBOX =====================

app.get('/api/cinemas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT CinemaID, CinemaName FROM Cinema ORDER BY CinemaName')
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

// Manager đang Active của 1 rạp (để chọn người quản lý cho Cashier)
app.get('/api/managers', async (req, res) => {
  const cinemaId = req.query.cinemaId || null
  try {
    const [rows] = await pool.query(
      `SELECT s.UserID, u.Name, s.Salary FROM Staff s JOIN Users u ON u.UserID = s.UserID
       WHERE s.Position = 'Manager' AND s.Status = 'Active' AND (? IS NULL OR s.CinemaID = ?)
       ORDER BY u.Name`, [cinemaId, cinemaId])
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

app.get('/api/genres', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT GenreID, GenreName FROM Genre ORDER BY GenreName')
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

// ===================== THỐNG KÊ (mục 3.3) =====================
// TODO(Tài): tên và tham số phải khớp với SQL trong 03_procedures.sql và 04_functions.sql

// -> sp_ReviewStatsByMovie (P2)
app.get('/api/reports/review-stats', async (req, res) => {
  const { genreId, fromDate, minReviews } = req.query
  if (minReviews && (!Number.isInteger(+minReviews) || +minReviews < 0)) {
    return res.status(400).json({ error: 'Số review tối thiểu phải là số nguyên không âm' })
  }
  try {
    const rows = await callProc('sp_ReviewStatsByMovie', [
      genreId ? Number(genreId) : null, orNull(fromDate), minReviews ? Number(minReviews) : 0,
    ])
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

// -> fn_CheckTicketCombo (F2)
app.get('/api/reports/check-combo/:bookingId', async (req, res) => {
  const id = Number(req.params.bookingId)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mã booking phải là số nguyên dương' })
  try {
    const [rows] = await pool.query('SELECT fn_CheckTicketCombo(?) AS result', [id])
    res.json({ result: rows[0].result })
  } catch (err) { sendError(res, err) }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Backend chạy tại http://localhost:${PORT}`))
