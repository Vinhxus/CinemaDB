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
DELIMITER $$

DROP FUNCTION IF EXISTS fn_RoomOccupancyRate $$
CREATE FUNCTION fn_RoomOccupancyRate(p_CinemaID INT, p_RoomNumber INT, p_Date DATE)
RETURNS DECIMAL(5,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE room_capacity INT;
    DECLARE screening_start TIME;
    DECLARE occupied_seats BIGINT;
    DECLARE total_occupied_seats BIGINT DEFAULT 0;
    DECLARE total_seats BIGINT DEFAULT 0;
    DECLARE done BOOLEAN DEFAULT FALSE;

    DECLARE screening_cursor CURSOR FOR
        SELECT s.StartTime
        FROM Screening AS s
        WHERE s.CinemaID = p_CinemaID
          AND s.RoomNumber = p_RoomNumber
          AND s.ScreenDate = p_Date;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    IF p_CinemaID IS NULL OR p_CinemaID <= 0
       OR p_RoomNumber IS NULL OR p_RoomNumber <= 0
       OR p_Date IS NULL OR YEAR(p_Date) = 0 OR MONTH(p_Date) = 0 OR DAY(p_Date) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cinema ID, room number, and screening date must be valid';
    END IF;

    SET room_capacity = (
        SELECT r.Capacity
        FROM ScreeningRoom AS r
        WHERE r.CinemaID = p_CinemaID AND r.RoomNumber = p_RoomNumber
    );

    IF room_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Screening room does not exist';
    END IF;

    OPEN screening_cursor;

    screening_loop: LOOP
        FETCH screening_cursor INTO screening_start;
        IF done THEN
            LEAVE screening_loop;
        END IF;

        SELECT COUNT(DISTINCT t.SeatRow, t.SeatNumber) INTO occupied_seats
        FROM Ticket AS t
        JOIN Booking AS b ON b.BookingID = t.BookingID
        WHERE t.CinemaID = p_CinemaID
          AND t.RoomNumber = p_RoomNumber
          AND t.ScreenDate = p_Date
          AND t.StartTime = screening_start
          AND t.Status IN ('Valid', 'CheckedIn')
          AND b.Status IN ('Holding', 'Paid');

        SET total_occupied_seats = total_occupied_seats + occupied_seats;
        SET total_seats = total_seats + room_capacity;
    END LOOP;

    CLOSE screening_cursor;

    IF total_seats = 0 THEN
        RETURN NULL;
    END IF;

    RETURN ROUND(total_occupied_seats * 100.00 / total_seats, 2);
END $$

DELIMITER ;


-- F2 (Tài): Kiểm tra TicketCombo của một booking (SeatCount, SeatType, Format), dùng cursor.
-- TODO(Tài): viết thân hàm. Backend đang gọi đúng tên dưới đây:
--   fn_CheckTicketCombo(p_BookingID INT) RETURNS VARCHAR(255)
--   Trả về 'OK' hoặc chuỗi mô tả lỗi cụ thể.
