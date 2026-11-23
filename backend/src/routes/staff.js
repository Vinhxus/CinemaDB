// Mục 3.1 + 3.2: mọi thao tác thêm/sửa/xóa đều gọi thủ tục ở mục 2.1,
// danh sách lấy bằng thủ tục P1 ở mục 2.3.
const router = require('express').Router();
const { pool, callProc } = require('../db');
const { sendDbError } = require('../errors');

const emptyToNull = (v) => (v === undefined || v === '' ? null : v);

// GET /api/staff?keyword=&cinemaId=&position=&status=&sortBy=   -> sp_ListStaff (P1)
router.get('/', async (req, res) => {
  const { keyword, cinemaId, position, status, sortBy } = req.query;
  try {
    const rows = await callProc('sp_ListStaff', [
      emptyToNull(keyword),
      emptyToNull(cinemaId) === null ? null : Number(cinemaId),
      emptyToNull(position),
      emptyToNull(status),
      sortBy || 'name',
    ]);
    res.json(rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/staff/:id  -> lấy 1 nhân viên để đổ vào form sửa
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.UserID, u.Name, u.BirthDate, u.Email, u.Phone, s.StartDate, s.Salary,
              s.Status, s.Position, s.CinemaID, s.SupervisorID
       FROM Staff s JOIN Users u ON u.UserID = s.UserID WHERE s.UserID = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    res.json(rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// POST /api/staff  -> sp_InsertStaff
router.post('/', async (req, res) => {
  const b = req.body;
  try {
    const rows = await callProc('sp_InsertStaff', [
      b.name, emptyToNull(b.birthDate), b.email, b.phone, b.password,
      emptyToNull(b.startDate), emptyToNull(b.salary), b.position,
      emptyToNull(b.cinemaId), emptyToNull(b.supervisorId),
    ]);
    res.status(201).json({ message: 'Thêm nhân viên thành công', userId: rows[0]?.NewUserID });
  } catch (err) { sendDbError(res, err); }
});

// PUT /api/staff/:id  -> sp_UpdateStaff
router.put('/:id', async (req, res) => {
  const b = req.body;
  try {
    await callProc('sp_UpdateStaff', [
      Number(req.params.id), b.name, emptyToNull(b.birthDate), b.email, b.phone,
      emptyToNull(b.startDate), emptyToNull(b.salary), b.position, b.status,
      emptyToNull(b.cinemaId), emptyToNull(b.supervisorId),
    ]);
    res.json({ message: 'Cập nhật nhân viên thành công' });
  } catch (err) { sendDbError(res, err); }
});

// DELETE /api/staff/:id  -> sp_DeleteStaff
router.delete('/:id', async (req, res) => {
  try {
    await callProc('sp_DeleteStaff', [Number(req.params.id)]);
    res.json({ message: 'Đã xóa nhân viên' });
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
