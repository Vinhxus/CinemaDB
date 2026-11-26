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

// -> fn_RoomOccupancyRate (F1)
// TODO(Ca): tên/tham số phải khớp với SQL trong 04_functions.sql
app.get('/api/reports/occupancy', async (req, res) => {
  const cinemaId = Number(req.query.cinemaId)
  const roomNumber = Number(req.query.roomNumber)
  const { date } = req.query
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) return res.status(400).json({ error: 'Vui lòng chọn rạp' })
  if (!Number.isInteger(roomNumber) || roomNumber <= 0) return res.status(400).json({ error: 'Vui lòng chọn phòng chiếu' })
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Vui lòng chọn ngày chiếu hợp lệ' })
  try {
    const [rows] = await pool.query('SELECT fn_RoomOccupancyRate(?, ?, ?) AS result', [cinemaId, roomNumber, date])
    res.json({ result: rows[0].result })
  } catch (err) { sendError(res, err) }
})

// Phòng chiếu của 1 rạp (combobox cho F1)
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT CinemaID, RoomNumber, RoomType, Capacity FROM ScreeningRoom
       WHERE (? IS NULL OR CinemaID = ?) ORDER BY CinemaID, RoomNumber`,
      [req.query.cinemaId || null, req.query.cinemaId || null])
    res.json(rows)
  } catch (err) { sendError(res, err) }
})

// ===================== XEM TOÀN BỘ DATABASE (chỉ đọc) =====================
// Dùng cho trang Tổng quan và Duyệt dữ liệu. Chỉ SELECT, không sửa dữ liệu.
// Tên bảng lấy từ danh sách cố định bên dưới, không lấy thẳng từ người dùng (tránh SQL injection).

const TABLE_GROUPS = [
  { key: 'M1', title: 'Người dùng', owner: 'Vinh', tables: ['Cinema', 'Users', 'Client', 'Staff'] },
  { key: 'M2', title: 'Rạp và phim', owner: 'Ca',
    tables: ['ScreeningRoom', 'Seat', 'Movie', 'Genre', 'MovieGenre', 'Actor', 'Perform', 'PerformRole', 'Screening'] },
  { key: 'M3', title: 'Đặt vé và thanh toán', owner: 'Hoàng', tables: ['Promotion', 'Booking', 'Ticket', 'Payment'] },
  { key: 'M4', title: 'Combo và đánh giá', owner: 'Tài',
    tables: ['TicketCombo', 'Product', 'SingleItem', 'FoodCombo', 'ComboDetail', 'OrderItem', 'Review', 'MovieReview', 'ServiceReview'] },
]
const ALL_TABLES = TABLE_GROUPS.flatMap((g) => g.tables)
const HIDDEN_COLUMNS = { Users: ['HashedPassword'] }               // không đưa mật khẩu lên giao diện
const DERIVED_COLUMNS = {                                          // thuộc tính dẫn xuất do trigger 2.2.2 tính
  Booking: ['TotalAmount', 'EarnedPoints'],
  Client: ['RewardPoints'],
}
// Trên Windows MySQL lưu tên bảng chữ thường -> đổi về tên chuẩn
const canonical = (name) => ALL_TABLES.find((t) => t.toLowerCase() === String(name || '').toLowerCase()) || name

app.get('/api/schema', async (req, res) => {
  try {
    const counts = {}
    for (const t of ALL_TABLES) {
      try {
        const [r] = await pool.query(`SELECT COUNT(*) AS n FROM \`${t}\``)
        counts[t] = Number(r[0].n)
      } catch { counts[t] = null }                                 // bảng chưa được tạo
    }
    const [routines] = await pool.query(
      `SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = DATABASE() ORDER BY ROUTINE_TYPE, ROUTINE_NAME`)
    const [triggers] = await pool.query(
      `SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing, EVENT_MANIPULATION AS event,
              EVENT_OBJECT_TABLE AS tableName FROM information_schema.TRIGGERS
       WHERE TRIGGER_SCHEMA = DATABASE() ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME`)
    res.json({
      groups: TABLE_GROUPS.map((g) => ({ ...g, tables: g.tables.map((t) => ({ name: t, rows: counts[t] })) })),
      routines,
      triggers: triggers.map((t) => ({ ...t, tableName: canonical(t.tableName) })),
    })
  } catch (err) { sendError(res, err) }
})

app.get('/api/tables/:name', async (req, res) => {
  const table = ALL_TABLES.find((t) => t.toLowerCase() === req.params.name.toLowerCase())
  if (!table) return res.status(404).json({ error: `Không có bảng "${req.params.name}" trong database` })
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_KEY AS keyType,
              COLUMN_DEFAULT AS defaultValue, EXTRA AS extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) ORDER BY ORDINAL_POSITION`, [table])
    if (cols.length === 0) return res.status(404).json({ error: `Bảng ${table} chưa được tạo. Hãy chạy 01_schema.sql` })

    const [pk] = await pool.query(
      `SELECT COLUMN_NAME AS col FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND CONSTRAINT_NAME = 'PRIMARY'`, [table])
    const [fks] = await pool.query(
      `SELECT CONSTRAINT_NAME AS name, COLUMN_NAME AS col, REFERENCED_TABLE_NAME AS refTable, REFERENCED_COLUMN_NAME AS refCol
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND REFERENCED_TABLE_NAME IS NOT NULL`, [table])
    const [uniques] = await pool.query(
      `SELECT k.CONSTRAINT_NAME AS name, k.COLUMN_NAME AS col
       FROM information_schema.TABLE_CONSTRAINTS t
       JOIN information_schema.KEY_COLUMN_USAGE k
         ON k.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME = t.CONSTRAINT_NAME AND k.TABLE_NAME = t.TABLE_NAME
       WHERE t.TABLE_SCHEMA = DATABASE() AND LOWER(t.TABLE_NAME) = LOWER(?) AND t.CONSTRAINT_TYPE = 'UNIQUE'`, [table])
    const [checks] = await pool.query(
      `SELECT c.CONSTRAINT_NAME AS name, c.CHECK_CLAUSE AS clause
       FROM information_schema.TABLE_CONSTRAINTS t
       JOIN information_schema.CHECK_CONSTRAINTS c
         ON c.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME = t.CONSTRAINT_NAME
       WHERE t.TABLE_SCHEMA = DATABASE() AND LOWER(t.TABLE_NAME) = LOWER(?) AND t.CONSTRAINT_TYPE = 'CHECK'
       ORDER BY c.CONSTRAINT_NAME`, [table])
    const [triggers] = await pool.query(
      `SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing, EVENT_MANIPULATION AS event
       FROM information_schema.TRIGGERS
       WHERE TRIGGER_SCHEMA = DATABASE() AND LOWER(EVENT_OBJECT_TABLE) = LOWER(?) ORDER BY TRIGGER_NAME`, [table])

    const hidden = HIDDEN_COLUMNS[table] || []
    const visible = cols.filter((c) => !hidden.includes(c.name))
    const pkCols = pk.map((p) => p.col)
    const [rows] = await pool.query(
      `SELECT ${visible.map((c) => `\`${c.name}\``).join(', ')} FROM \`${table}\`
       ${pkCols.length ? 'ORDER BY ' + pkCols.map((c) => `\`${c}\``).join(', ') : ''} LIMIT 1000`)

    res.json({
      table,
      columns: visible.map((c) => ({
        ...c,
        primaryKey: pkCols.includes(c.name),
        unique: uniques.some((u) => u.col === c.name),
        derived: (DERIVED_COLUMNS[table] || []).includes(c.name),
        references: fks.filter((f) => f.col === c.name).map((f) => ({ table: canonical(f.refTable), column: f.refCol })),
      })),
      hiddenColumns: hidden,
      checks,
      triggers,
      rows,
    })
  } catch (err) { sendError(res, err) }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Backend chạy tại http://localhost:${PORT}`))
