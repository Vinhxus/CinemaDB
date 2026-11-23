// Lỗi do SIGNAL SQLSTATE '45000' trong procedure/trigger -> 400 kèm nguyên thông báo
// Lỗi ràng buộc CHECK/FK/UNIQUE -> 400 kèm thông báo dễ hiểu
// Lỗi khác -> 500
function sendDbError(res, err) {
  console.error(err.code, err.sqlMessage || err.message);
  if (err.sqlState === '45000') {
    return res.status(400).json({ error: err.sqlMessage });
  }
  const map = {
    ER_DUP_ENTRY: 'Dữ liệu bị trùng với một bản ghi đã có',
    ER_CHECK_CONSTRAINT_VIOLATED: 'Dữ liệu vi phạm ràng buộc: ' + (err.sqlMessage || ''),
    ER_ROW_IS_REFERENCED_2: 'Không thể xóa vì dữ liệu đang được bản ghi khác tham chiếu',
    ER_NO_REFERENCED_ROW_2: 'Dữ liệu tham chiếu tới bản ghi không tồn tại',
    ER_SP_DOES_NOT_EXIST: 'Thủ tục/hàm chưa được tạo trong database: ' + (err.sqlMessage || ''),
  };
  if (map[err.code]) return res.status(400).json({ error: map[err.code] });
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({ error: 'Không kết nối được database. Kiểm tra MySQL và file backend/.env' });
  }
  return res.status(500).json({ error: 'Lỗi máy chủ: ' + (err.sqlMessage || err.message) });
}

module.exports = { sendDbError };
