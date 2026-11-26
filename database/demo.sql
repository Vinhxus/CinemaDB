-- =====================================================================
-- Demo mục 2.1 + trigger Module 1 (Vinh)
-- Chạy từng câu một khi thuyết trình. Các câu đánh dấu [LỖI] phải báo lỗi
-- với thông báo cụ thể; các câu [OK] phải chạy thành công.
-- =====================================================================
USE cinema;

-- ---------- sp_InsertStaff ----------
-- [OK] Thêm cashier hợp lệ cho rạp 2, quản lý là UserID 2
CALL sp_InsertStaff('Lâm Chí Thanh', '2002-03-03', 'thanh.lam@cinema.vn', '0901000020', '123456',
                    '2024-08-01', 7800000, 'Cashier', 2, 2);
-- [LỖI] chưa đủ 18 tuổi tại ngày bắt đầu
CALL sp_InsertStaff('Nguyễn Nhỏ', '2008-05-01', 'nho@cinema.vn', '0901000021', '123456',
                    '2025-01-01', 7000000, 'Cashier', 1, 1);
-- [LỖI] email sai định dạng
CALL sp_InsertStaff('Sai Email', '2000-01-01', 'saiemail.com', '0901000022', '123456',
                    '2024-01-01', 7000000, 'Cashier', 1, 1);
-- [LỖI] số điện thoại đã tồn tại
CALL sp_InsertStaff('Trùng Phone', '2000-01-01', 'trung@cinema.vn', '0901000001', '123456',
                    '2024-01-01', 7000000, 'Cashier', 1, 1);
-- [LỖI] lương cashier không thấp hơn lương quản lý
CALL sp_InsertStaff('Lương Cao', '2000-01-01', 'luongcao@cinema.vn', '0901000023', '123456',
                    '2024-01-01', 40000000, 'Cashier', 1, 1);
-- [LỖI] quản lý ở rạp khác (RB6)
CALL sp_InsertStaff('Khác Rạp', '2000-01-01', 'khacrap@cinema.vn', '0901000024', '123456',
                    '2024-01-01', 7000000, 'Cashier', 1, 2);
-- [LỖI] người được chọn làm quản lý là Cashier (RB1)
CALL sp_InsertStaff('Sai Cấp', '2000-01-01', 'saicap@cinema.vn', '0901000025', '123456',
                    '2024-01-01', 7000000, 'Cashier', 1, 6);

-- ---------- sp_UpdateStaff ----------
-- [OK] tăng lương cashier 6
CALL sp_UpdateStaff(6, 'Đặng Gia Huy', '2001-04-05', 'huy.dang@cinema.vn', '0901000006',
                    '2022-07-01', 8800000, 'Cashier', 'Active', 1, 1);
-- [LỖI] Manager 1 còn nhân viên dưới quyền mà muốn nghỉ việc (RB5)
CALL sp_UpdateStaff(1, 'Trần Minh Quân', '1985-03-12', 'quan.tran@cinema.vn', '0901000001',
                    '2015-06-01', 32000000, 'Manager', 'Resigned', 1, NULL);
-- [LỖI] Manager 1 giảm lương xuống thấp hơn nhân viên dưới quyền
CALL sp_UpdateStaff(1, 'Trần Minh Quân', '1985-03-12', 'quan.tran@cinema.vn', '0901000001',
                    '2015-06-01', 8000000, 'Manager', 'Active', 1, NULL);

-- ---------- sp_DeleteStaff ----------
-- [LỖI] nhân viên 6 còn đang Active
CALL sp_DeleteStaff(6);
-- [LỖI] manager 1 chưa nghỉ việc
CALL sp_DeleteStaff(1);
-- [OK] nhân viên 10 đã Resigned, không có booking / vé đã soát
CALL sp_DeleteStaff(10);

-- ---------- Trigger (gọi thẳng INSERT/UPDATE, không qua thủ tục) ----------
-- [LỖI] trg_staff_bu: đổi StartDate làm nhân viên chưa đủ 18 tuổi (RB3)
UPDATE Staff SET StartDate = '2015-01-01' WHERE UserID = 9;
-- [LỖI] trg_users_bu: đổi loại tài khoản
UPDATE Users SET UserType = 'Client' WHERE UserID = 6;

-- ---------- 2.3 P1 ----------
CALL sp_ListStaff(NULL, NULL, NULL, NULL, 'name');
CALL sp_ListStaff('nguyễn', NULL, NULL, NULL, 'salary_desc');
CALL sp_ListStaff(NULL, 1, 'Cashier', 'Active', 'start_date');
