-- =====================================================================
-- 04_functions.sql  —  Mục 2.4: hai hàm
-- Mỗi hàm phải có: IF và/hoặc LOOP, CURSOR, câu truy vấn lấy dữ liệu để
-- kiểm tra/tính toán, tham số đầu vào và kiểm tra tham số đầu vào.
-- Chạy sau 03_procedures.sql.
-- Lưu ý MySQL: nếu bật binary log, cần chạy lệnh dưới (hoặc khai báo READS SQL DATA).
-- =====================================================================
USE cinema;
SET GLOBAL log_bin_trust_function_creators = 1;

-- F1 (Ca): Tỷ lệ lấp đầy / số ghế trống của một phòng (hoặc một suất chiếu), dùng cursor.
-- TODO(Ca): viết thân hàm. Gợi ý chữ ký:
--   fn_RoomOccupancyRate(p_CinemaID INT, p_RoomNumber INT, p_Date DATE) RETURNS DECIMAL(5,2)


-- F2 (Tài): Kiểm tra TicketCombo của một booking (SeatCount, SeatType, Format), dùng cursor.
-- TODO(Tài): viết thân hàm. Backend đang gọi đúng tên dưới đây:
--   fn_CheckTicketCombo(p_BookingID INT) RETURNS VARCHAR(255)
--   Trả về 'OK' hoặc chuỗi mô tả lỗi cụ thể.
