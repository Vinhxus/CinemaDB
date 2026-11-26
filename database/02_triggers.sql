-- =====================================================================
-- 02_triggers.sql  —  Trigger kiểm tra ràng buộc ngữ nghĩa + trigger mục 2.2
-- Chạy sau 01_schema.sql.
-- Chỉ dùng trigger cho ràng buộc KHÔNG viết được bằng CHECK/FK/UNIQUE
-- (ràng buộc so sánh nhiều bảng, hoặc phụ thuộc thời điểm hiện tại).
-- Mọi lỗi dùng SIGNAL SQLSTATE '45000' với thông báo cụ thể.
-- =====================================================================
USE cinema;

DELIMITER $$

-- =====================================================================
-- MODULE 1: USER  (Vinh)  —  RB1, RB3, RB5, RB6
-- =====================================================================

-- RB1 (chuyên biệt hóa rời nhau): chỉ User có UserType='Client' mới có dòng trong Client
DROP TRIGGER IF EXISTS trg_client_bi $$
CREATE TRIGGER trg_client_bi BEFORE INSERT ON Client
FOR EACH ROW
BEGIN
    IF (SELECT UserType FROM Users WHERE UserID = NEW.UserID) <> 'Client' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tài khoản này có UserType khác Client, không thể thêm vào bảng Client';
    END IF;
END $$

-- Kiểm tra chung cho Staff khi INSERT/UPDATE: RB1, RB3, RB5, RB6
DROP TRIGGER IF EXISTS trg_staff_bi $$
CREATE TRIGGER trg_staff_bi BEFORE INSERT ON Staff
FOR EACH ROW
BEGIN
    DECLARE v_type VARCHAR(10);
    DECLARE v_birth DATE;
    DECLARE v_sup_pos VARCHAR(10);
    DECLARE v_sup_status VARCHAR(10);
    DECLARE v_sup_cinema INT;

    SELECT UserType, BirthDate INTO v_type, v_birth FROM Users WHERE UserID = NEW.UserID;

    -- RB1: rời nhau
    IF v_type <> 'Staff' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tài khoản này có UserType khác Staff, không thể thêm vào bảng Staff';
    END IF;

    -- RB3: đủ 18 tuổi tính đến StartDate
    IF TIMESTAMPDIFF(YEAR, v_birth, NEW.StartDate) < 18 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu làm việc';
    END IF;

    IF NEW.SupervisorID IS NOT NULL THEN
        SELECT Position, Status, CinemaID INTO v_sup_pos, v_sup_status, v_sup_cinema
        FROM Staff WHERE UserID = NEW.SupervisorID;
        -- RB1: người quản lý phải là Manager
        IF v_sup_pos <> 'Manager' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không phải là Manager';
        END IF;
        -- RB5: không gán người quản lý đã nghỉ việc / bị đình chỉ
        IF v_sup_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn đang không ở trạng thái Active';
        END IF;
        -- RB6: cùng rạp
        IF v_sup_cinema <> NEW.CinemaID THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên và người quản lý phải làm việc cùng một rạp';
        END IF;
    END IF;
END $$

DROP TRIGGER IF EXISTS trg_staff_bu $$
CREATE TRIGGER trg_staff_bu BEFORE UPDATE ON Staff
FOR EACH ROW
BEGIN
    DECLARE v_birth DATE;
    DECLARE v_sup_pos VARCHAR(10);
    DECLARE v_sup_status VARCHAR(10);
    DECLARE v_sup_cinema INT;
    DECLARE v_sub_count INT;

    -- RB3
    IF NEW.StartDate <> OLD.StartDate THEN
        SELECT BirthDate INTO v_birth FROM Users WHERE UserID = NEW.UserID;
        IF TIMESTAMPDIFF(YEAR, v_birth, NEW.StartDate) < 18 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu làm việc';
        END IF;
    END IF;

    -- RB1, RB5, RB6 cho người quản lý mới
    IF NEW.SupervisorID IS NOT NULL AND
       (NOT (NEW.SupervisorID <=> OLD.SupervisorID) OR NEW.CinemaID <> OLD.CinemaID) THEN
        SELECT Position, Status, CinemaID INTO v_sup_pos, v_sup_status, v_sup_cinema
        FROM Staff WHERE UserID = NEW.SupervisorID;
        IF v_sup_pos <> 'Manager' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn không phải là Manager';
        END IF;
        IF v_sup_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người quản lý được chọn đang không ở trạng thái Active';
        END IF;
        IF v_sup_cinema <> NEW.CinemaID THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên và người quản lý phải làm việc cùng một rạp';
        END IF;
    END IF;

    -- Các thay đổi trên một Manager đang có nhân viên dưới quyền (chưa nghỉ)
    IF OLD.Position = 'Manager' THEN
        SELECT COUNT(*) INTO v_sub_count FROM Staff
        WHERE SupervisorID = OLD.UserID AND Status <> 'Resigned';
        IF v_sub_count > 0 THEN
            IF NEW.Position <> 'Manager' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, không thể đổi chức vụ';
            END IF;
            -- RB5: phải chuyển nhân viên dưới quyền sang manager khác trước khi nghỉ / bị đình chỉ
            IF NEW.Status <> 'Active' AND OLD.Status = 'Active' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, cần chuyển họ sang manager khác trước';
            END IF;
            -- RB6
            IF NEW.CinemaID <> OLD.CinemaID THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manager còn nhân viên dưới quyền, không thể chuyển sang rạp khác';
            END IF;
        END IF;
    END IF;
END $$

-- RB3 khi sửa BirthDate trong Users; RB1: không cho đổi UserType
DROP TRIGGER IF EXISTS trg_users_bu $$
CREATE TRIGGER trg_users_bu BEFORE UPDATE ON Users
FOR EACH ROW
BEGIN
    DECLARE v_start DATE;
    IF NEW.UserType <> OLD.UserType THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi loại tài khoản (Client/Staff)';
    END IF;
    IF NEW.BirthDate <> OLD.BirthDate AND OLD.UserType = 'Staff' THEN
        SELECT StartDate INTO v_start FROM Staff WHERE UserID = NEW.UserID;
        IF v_start IS NOT NULL AND TIMESTAMPDIFF(YEAR, NEW.BirthDate, v_start) < 18 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu làm việc';
        END IF;
    END IF;
END $$

-- RB5: nhân viên không Active không được ghi nhận là người bán vé mới
DROP TRIGGER IF EXISTS trg_booking_staff_active $$
CREATE TRIGGER trg_booking_staff_active BEFORE INSERT ON Booking
FOR EACH ROW
BEGIN
    IF NEW.StaffID IS NOT NULL AND
       (SELECT Status FROM Staff WHERE UserID = NEW.StaffID) <> 'Active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên bán vé đang không ở trạng thái Active';
    END IF;
END $$

DELIMITER ;

-- =====================================================================
-- MODULE 2: CINEMA AND MOVIE  (Ca)
-- TODO(Ca):
--   * RB3: Capacity của phòng = số ghế của phòng (INSERT/DELETE trên Seat, UPDATE Capacity)
--   * RB5: Actor.DateOfBirth <= CURDATE()
--   * MỤC 2.2.1 (trigger ràng buộc nghiệp vụ): suất chiếu không chồng giờ trong
--     cùng phòng (RB1) và không trước ngày phát hành phim (RB2).
--     Thao tác có thể vi phạm: INSERT Screening, UPDATE Screening (giờ/phòng/phim),
--     UPDATE Movie.Duration, UPDATE Movie.ReleaseDate.
-- =====================================================================


-- =====================================================================
-- MODULE 3: BOOKING AND PAYMENT  (Hoàng)
-- TODO(Hoàng):
--   * RB1: mỗi ghế / suất chiếu chỉ có tối đa 1 vé chưa hủy (bỏ qua booking Expired)
--   * RB4: vé thanh toán qua đối tác (MoMo...) không được hủy/đổi
--   * RB5: promotion còn hạn và chưa vượt UsageLimit
--   * RB6: chỉ tạo vé cho suất chiếu chưa bắt đầu
--   * MỤC 2.2.2 (thuộc tính dẫn xuất, tính theo chuỗi):
--       Ticket.Price / OrderItem -> Booking.TotalAmount -> Booking.EarnedPoints -> Client.RewardPoints
--     Thao tác ảnh hưởng: INSERT/UPDATE/DELETE trên Ticket, OrderItem;
--     UPDATE Booking (PromotionID, TicketComboID); UPDATE Payment.Status -> 'Success'.
--     Nhớ: phải tính TotalAmount TRƯỚC rồi mới tính EarnedPoints (RB2 M1).
-- =====================================================================


-- =====================================================================
-- MODULE 4: COMBO AND FEEDBACK  (Tài)
-- TODO(Tài):
--   * RB1: FoodCombo.DiscountPrice <= Product.Price
--   * RB3: combo chỉ dùng khi BookingTime nằm trong [StartDate, EndDate]
--   * RB4: ProductType khớp bảng con; ReviewType khớp bảng con
--   * RB5: booking dùng TicketCombo phải có đúng SeatCount vé, đúng SeatType, đúng Format
--   * RB6: chỉ được review sau khi đã mua (booking Paid, đúng client...)
--   * RB7: mỗi client 1 review cho 1 phim, 1 service review cho 1 booking
-- =====================================================================
