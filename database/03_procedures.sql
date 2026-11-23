-- =====================================================================
-- 03_procedures.sql  —  Mục 2.1 (thêm/sửa/xóa Staff) và 2.3 (2 thủ tục truy vấn)
-- Chạy sau 02_triggers.sql.
-- =====================================================================
USE cinema_db;

DELIMITER $$

-- =====================================================================
-- 2.1  THỦ TỤC THÊM / SỬA / XÓA TRÊN BẢNG STAFF  (Vinh)
-- Một nhân viên gồm 1 dòng Users + 1 dòng Staff, nên mỗi thủ tục
-- thao tác trên cả hai bảng trong một transaction.
-- =====================================================================

DROP PROCEDURE IF EXISTS sp_InsertStaff $$
CREATE PROCEDURE sp_InsertStaff(
    IN p_Name          VARCHAR(100),
    IN p_BirthDate     DATE,
    IN p_Email         VARCHAR(100),
    IN p_Phone         VARCHAR(15),
    IN p_Password      VARCHAR(100),
    IN p_StartDate     DATE,
    IN p_Salary        DECIMAL(12,0),
    IN p_Position      VARCHAR(10),
    IN p_CinemaID      INT,
    IN p_SupervisorID  INT
)
BEGIN
    DECLARE v_sup_pos VARCHAR(10);
    DECLARE v_sup_status VARCHAR(10);
    DECLARE v_sup_cinema INT;
    DECLARE v_sup_salary DECIMAL(12,0);
    DECLARE v_new_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- ---- Kiểm tra dữ liệu bắt buộc ----
    IF p_Name IS NULL OR TRIM(p_Name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Họ tên nhân viên không được để trống';
    END IF;
    IF p_BirthDate IS NULL OR p_StartDate IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ngày sinh và ngày bắt đầu làm việc không được để trống';
    END IF;
    IF p_Password IS NULL OR CHAR_LENGTH(p_Password) < 6 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mật khẩu phải có ít nhất 6 ký tự';
    END IF;

    -- ---- Định dạng và tính duy nhất của Email / Phone (RB4) ----
    IF p_Email IS NULL OR p_Email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email không đúng định dạng (ví dụ: ten@gmail.com)';
    END IF;
    IF p_Phone IS NULL OR p_Phone NOT REGEXP '^0[0-9]{9}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0';
    END IF;
    IF EXISTS (SELECT 1 FROM Users WHERE Email = p_Email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email này đã được dùng cho một tài khoản khác';
    END IF;
    IF EXISTS (SELECT 1 FROM Users WHERE Phone = p_Phone) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại này đã được dùng cho một tài khoản khác';
    END IF;

    -- ---- Tuổi (RB3) ----
    IF p_BirthDate >= CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ngày sinh phải trước ngày hiện tại';
    END IF;
    IF TIMESTAMPDIFF(YEAR, p_BirthDate, p_StartDate) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu làm việc';
    END IF;

    -- ---- Lương, chức vụ, rạp ----
    IF p_Salary IS NULL OR p_Salary <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lương phải lớn hơn 0';
    END IF;
    IF p_Position IS NULL OR p_Position NOT IN ('Cashier','Manager') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chức vụ chỉ được là Cashier hoặc Manager';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM Cinema WHERE CinemaID = p_CinemaID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rạp được chọn không tồn tại';
    END IF;

    -- ---- Người quản lý (RB1, RB5, RB6) ----
    IF p_Position = 'Manager' AND p_SupervisorID IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager không có người quản lý (hệ thống chỉ có 2 cấp)';
    END IF;
    IF p_Position = 'Cashier' THEN
        IF p_SupervisorID IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cashier bắt buộc phải có người quản lý';
        END IF;
        SELECT Position, Status, CinemaID, Salary
          INTO v_sup_pos, v_sup_status, v_sup_cinema, v_sup_salary
        FROM Staff WHERE UserID = p_SupervisorID;
        IF v_sup_pos IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không tồn tại';
        END IF;
        IF v_sup_pos <> 'Manager' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không phải là Manager';
        END IF;
        IF v_sup_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn đang không ở trạng thái Active';
        END IF;
        IF v_sup_cinema <> p_CinemaID THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên và người quản lý phải làm việc cùng một rạp';
        END IF;
        IF p_Salary >= v_sup_salary THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lương của Cashier phải thấp hơn lương của người quản lý';
        END IF;
    END IF;

    -- ---- Ghi dữ liệu ----
    START TRANSACTION;
        INSERT INTO Users (Name, BirthDate, Email, Phone, HashedPassword, UserType)
        VALUES (TRIM(p_Name), p_BirthDate, p_Email, p_Phone, SHA2(p_Password, 256), 'Staff');
        SET v_new_id = LAST_INSERT_ID();
        INSERT INTO Staff (UserID, StartDate, Salary, Status, Position, CinemaID, SupervisorID)
        VALUES (v_new_id, p_StartDate, p_Salary, 'Active', p_Position, p_CinemaID, p_SupervisorID);
    COMMIT;

    SELECT v_new_id AS NewUserID;
END $$


DROP PROCEDURE IF EXISTS sp_UpdateStaff $$
CREATE PROCEDURE sp_UpdateStaff(
    IN p_UserID        INT,
    IN p_Name          VARCHAR(100),
    IN p_BirthDate     DATE,
    IN p_Email         VARCHAR(100),
    IN p_Phone         VARCHAR(15),
    IN p_StartDate     DATE,
    IN p_Salary        DECIMAL(12,0),
    IN p_Position      VARCHAR(10),
    IN p_Status        VARCHAR(10),
    IN p_CinemaID      INT,
    IN p_SupervisorID  INT
)
BEGIN
    DECLARE v_old_pos VARCHAR(10);
    DECLARE v_old_status VARCHAR(10);
    DECLARE v_old_cinema INT;
    DECLARE v_sub_count INT DEFAULT 0;
    DECLARE v_max_sub_salary DECIMAL(12,0);
    DECLARE v_sup_pos VARCHAR(10);
    DECLARE v_sup_status VARCHAR(10);
    DECLARE v_sup_cinema INT;
    DECLARE v_sup_salary DECIMAL(12,0);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT Position, Status, CinemaID INTO v_old_pos, v_old_status, v_old_cinema
    FROM Staff WHERE UserID = p_UserID;
    IF v_old_pos IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy nhân viên cần cập nhật';
    END IF;

    IF p_Name IS NULL OR TRIM(p_Name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Họ tên nhân viên không được để trống';
    END IF;
    IF p_BirthDate IS NULL OR p_StartDate IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ngày sinh và ngày bắt đầu làm việc không được để trống';
    END IF;
    IF p_Email IS NULL OR p_Email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email không đúng định dạng (ví dụ: ten@gmail.com)';
    END IF;
    IF p_Phone IS NULL OR p_Phone NOT REGEXP '^0[0-9]{9}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0';
    END IF;
    IF EXISTS (SELECT 1 FROM Users WHERE Email = p_Email AND UserID <> p_UserID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email này đã được dùng cho một tài khoản khác';
    END IF;
    IF EXISTS (SELECT 1 FROM Users WHERE Phone = p_Phone AND UserID <> p_UserID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại này đã được dùng cho một tài khoản khác';
    END IF;
    IF TIMESTAMPDIFF(YEAR, p_BirthDate, p_StartDate) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu làm việc';
    END IF;
    IF p_Salary IS NULL OR p_Salary <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lương phải lớn hơn 0';
    END IF;
    IF p_Position IS NULL OR p_Position NOT IN ('Cashier','Manager') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chức vụ chỉ được là Cashier hoặc Manager';
    END IF;
    IF p_Status IS NULL OR p_Status NOT IN ('Active','Suspended','Resigned') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trạng thái chỉ được là Active, Suspended hoặc Resigned';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM Cinema WHERE CinemaID = p_CinemaID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rạp được chọn không tồn tại';
    END IF;

    -- ---- Nếu đang là Manager có nhân viên dưới quyền (RB5, RB6) ----
    IF v_old_pos = 'Manager' THEN
        SELECT COUNT(*), MAX(Salary) INTO v_sub_count, v_max_sub_salary
        FROM Staff WHERE SupervisorID = p_UserID AND Status <> 'Resigned';
        IF v_sub_count > 0 THEN
            IF p_Position <> 'Manager' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, không thể đổi chức vụ';
            END IF;
            IF p_Status <> 'Active' AND v_old_status = 'Active' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, cần chuyển họ sang manager khác trước';
            END IF;
            IF p_CinemaID <> v_old_cinema THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, không thể chuyển sang rạp khác';
            END IF;
            IF p_Salary <= v_max_sub_salary THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lương Manager phải cao hơn lương của mọi nhân viên dưới quyền';
            END IF;
        END IF;
    END IF;

    -- ---- Người quản lý mới (RB1, RB5, RB6) ----
    IF p_Position = 'Manager' AND p_SupervisorID IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager không có người quản lý (hệ thống chỉ có 2 cấp)';
    END IF;
    IF p_Position = 'Cashier' THEN
        IF p_SupervisorID IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cashier bắt buộc phải có người quản lý';
        END IF;
        IF p_SupervisorID = p_UserID THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên không thể tự quản lý chính mình';
        END IF;
        SELECT Position, Status, CinemaID, Salary
          INTO v_sup_pos, v_sup_status, v_sup_cinema, v_sup_salary
        FROM Staff WHERE UserID = p_SupervisorID;
        IF v_sup_pos IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không tồn tại';
        END IF;
        IF v_sup_pos <> 'Manager' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không phải là Manager';
        END IF;
        IF v_sup_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn đang không ở trạng thái Active';
        END IF;
        IF v_sup_cinema <> p_CinemaID THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên và người quản lý phải làm việc cùng một rạp';
        END IF;
        IF p_Salary >= v_sup_salary THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lương của Cashier phải thấp hơn lương của người quản lý';
        END IF;
    END IF;

    START TRANSACTION;
        UPDATE Users
           SET Name = TRIM(p_Name), BirthDate = p_BirthDate, Email = p_Email, Phone = p_Phone
         WHERE UserID = p_UserID;
        UPDATE Staff
           SET StartDate = p_StartDate, Salary = p_Salary, Position = p_Position,
               Status = p_Status, CinemaID = p_CinemaID, SupervisorID = p_SupervisorID
         WHERE UserID = p_UserID;
    COMMIT;
END $$


-- XÓA NHÂN VIÊN
-- Mục đích: dọn các tài khoản nhân viên tạo nhầm hoặc đã nghỉ việc mà KHÔNG để lại
-- dữ liệu nghiệp vụ nào (giảm dữ liệu cá nhân không còn cần thiết).
-- Chỉ được xóa khi:
--   (1) nhân viên đã ở trạng thái Resigned,
--   (2) không còn nhân viên nào ghi nhận người này là quản lý,
--   (3) chưa từng xử lý booking nào tại quầy,
--   (4) chưa từng soát vé nào.
-- Trường hợp khác: giữ lại để bảo toàn lịch sử giao dịch, chỉ đổi Status bằng sp_UpdateStaff.
DROP PROCEDURE IF EXISTS sp_DeleteStaff $$
CREATE PROCEDURE sp_DeleteStaff(IN p_UserID INT)
BEGIN
    DECLARE v_status VARCHAR(10);
    DECLARE v_count INT;
    DECLARE v_msg VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT Status INTO v_status FROM Staff WHERE UserID = p_UserID;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy nhân viên cần xóa';
    END IF;
    IF v_status <> 'Resigned' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được xóa nhân viên đã nghỉ việc (Resigned). Hãy đổi trạng thái trước';
    END IF;

    SELECT COUNT(*) INTO v_count FROM Staff WHERE SupervisorID = p_UserID;
    IF v_count > 0 THEN
        SET v_msg = CONCAT('Không thể xóa: còn ', v_count, ' nhân viên ghi nhận người này là quản lý');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

    SELECT COUNT(*) INTO v_count FROM Booking WHERE StaffID = p_UserID;
    IF v_count > 0 THEN
        SET v_msg = CONCAT('Không thể xóa: nhân viên đã xử lý ', v_count, ' booking, cần giữ lại để bảo toàn lịch sử');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

    SELECT COUNT(*) INTO v_count FROM Ticket WHERE CheckInStaffID = p_UserID;
    IF v_count > 0 THEN
        SET v_msg = CONCAT('Không thể xóa: nhân viên đã soát ', v_count, ' vé, cần giữ lại để bảo toàn lịch sử');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

    START TRANSACTION;
        DELETE FROM Staff WHERE UserID = p_UserID;
        DELETE FROM Users WHERE UserID = p_UserID;
    COMMIT;
END $$


-- =====================================================================
-- 2.3  THỦ TỤC TRUY VẤN
-- =====================================================================

-- P1 (Vinh): Danh sách nhân viên — JOIN nhiều bảng, WHERE, ORDER BY.
-- Tham số NULL / rỗng = không lọc theo tiêu chí đó.
-- p_SortBy: 'name' | 'salary_asc' | 'salary_desc' | 'start_date'
DROP PROCEDURE IF EXISTS sp_ListStaff $$
CREATE PROCEDURE sp_ListStaff(
    IN p_Keyword   VARCHAR(100),
    IN p_CinemaID  INT,
    IN p_Position  VARCHAR(10),
    IN p_Status    VARCHAR(10),
    IN p_SortBy    VARCHAR(20)
)
BEGIN
    SELECT  s.UserID,
            u.Name, u.BirthDate, u.Email, u.Phone,
            s.StartDate, s.Salary, s.Status, s.Position,
            s.CinemaID, c.CinemaName,
            s.SupervisorID, su.Name AS SupervisorName,
            (SELECT COUNT(*) FROM Booking b WHERE b.StaffID = s.UserID) AS ProcessedBookings
    FROM Staff s
    JOIN Users  u  ON u.UserID   = s.UserID
    JOIN Cinema c  ON c.CinemaID = s.CinemaID
    LEFT JOIN Users su ON su.UserID = s.SupervisorID
    WHERE (p_Keyword IS NULL OR p_Keyword = ''
           OR u.Name LIKE CONCAT('%', p_Keyword, '%')
           OR u.Email LIKE CONCAT('%', p_Keyword, '%')
           OR u.Phone LIKE CONCAT('%', p_Keyword, '%'))
      AND (p_CinemaID IS NULL OR s.CinemaID = p_CinemaID)
      AND (p_Position IS NULL OR p_Position = '' OR s.Position = p_Position)
      AND (p_Status   IS NULL OR p_Status   = '' OR s.Status   = p_Status)
    ORDER BY
        CASE WHEN p_SortBy = 'salary_asc'  THEN s.Salary END ASC,
        CASE WHEN p_SortBy = 'salary_desc' THEN s.Salary END DESC,
        CASE WHEN p_SortBy = 'start_date'  THEN s.StartDate END ASC,
        u.Name ASC;
END $$

DELIMITER ;

-- P2 (Tài): Thống kê điểm review theo phim — JOIN nhiều bảng, aggregate,
-- GROUP BY, HAVING, WHERE, ORDER BY.
-- TODO(Tài): viết thân thủ tục. Backend đang gọi đúng tên và tham số dưới đây:
--   CALL sp_ReviewStatsByMovie(p_GenreID INT, p_FromDate DATE, p_MinReviews INT)
--   Gợi ý cột trả về: MovieID, Title, ReviewCount, AvgScore
