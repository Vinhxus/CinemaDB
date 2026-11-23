-- =====================================================================
-- 05_sample_data.sql  —  Dữ liệu mẫu (mỗi bảng >= 5 dòng)
-- Chạy SAU CÙNG để các trigger kiểm tra luôn dữ liệu mẫu.
-- Mật khẩu mẫu của mọi tài khoản: 123456
-- =====================================================================
USE cinema_db;

-- ---------------------------------------------------------------------
-- MODULE 1 (Vinh)
-- ---------------------------------------------------------------------
INSERT INTO Cinema (CinemaID, CinemaName, Address) VALUES
(1, 'Cinema Quận 1',     '135 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM'),
(2, 'Cinema Thủ Đức',    '216 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM'),
(3, 'Cinema Gò Vấp',     '242 Nguyễn Văn Lượng, Phường 10, Quận Gò Vấp, TP.HCM'),
(4, 'Cinema Quận 7',     '1058 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM'),
(5, 'Cinema Tân Bình',   '60A Trường Sơn, Phường 2, Quận Tân Bình, TP.HCM');

-- Users 1-5: Manager | 6-10: Cashier | 11-16: Client
INSERT INTO Users (UserID, Name, BirthDate, Email, Phone, HashedPassword, UserType) VALUES
(1,  'Trần Minh Quân',     '1985-03-12', 'quan.tran@cinema.vn',    '0901000001', SHA2('123456',256), 'Staff'),
(2,  'Nguyễn Thị Lan',     '1988-07-25', 'lan.nguyen@cinema.vn',   '0901000002', SHA2('123456',256), 'Staff'),
(3,  'Lê Văn Phúc',        '1983-11-02', 'phuc.le@cinema.vn',      '0901000003', SHA2('123456',256), 'Staff'),
(4,  'Phạm Thu Hà',        '1990-01-18', 'ha.pham@cinema.vn',      '0901000004', SHA2('123456',256), 'Staff'),
(5,  'Võ Đức Thắng',       '1987-09-30', 'thang.vo@cinema.vn',     '0901000005', SHA2('123456',256), 'Staff'),
(6,  'Đặng Gia Huy',       '2001-04-05', 'huy.dang@cinema.vn',     '0901000006', SHA2('123456',256), 'Staff'),
(7,  'Bùi Ngọc Ánh',       '2002-12-14', 'anh.bui@cinema.vn',      '0901000007', SHA2('123456',256), 'Staff'),
(8,  'Hoàng Tuấn Kiệt',    '2000-06-21', 'kiet.hoang@cinema.vn',   '0901000008', SHA2('123456',256), 'Staff'),
(9,  'Ngô Mỹ Linh',        '2003-02-09', 'linh.ngo@cinema.vn',     '0901000009', SHA2('123456',256), 'Staff'),
(10, 'Huỳnh Bảo Long',     '1999-08-17', 'long.huynh@cinema.vn',   '0901000010', SHA2('123456',256), 'Staff'),
(11, 'Nguyễn Hoàng Nam',   '2004-05-10', 'nam.nguyen@gmail.com',   '0912000011', SHA2('123456',256), 'Client'),
(12, 'Trương Khánh Vy',    '2003-10-22', 'vy.truong@gmail.com',    '0912000012', SHA2('123456',256), 'Client'),
(13, 'Lý Thanh Tùng',      '1995-01-03', 'tung.ly@gmail.com',      '0912000013', SHA2('123456',256), 'Client'),
(14, 'Mai Phương Thảo',    '1998-07-07', 'thao.mai@gmail.com',     '0912000014', SHA2('123456',256), 'Client'),
(15, 'Đỗ Quốc Bảo',        '2005-11-28', 'bao.do@gmail.com',       '0912000015', SHA2('123456',256), 'Client'),
(16, 'Phan Hải Yến',       '1992-04-16', 'yen.phan@gmail.com',     '0912000016', SHA2('123456',256), 'Client');

INSERT INTO Client (UserID, Address, RewardPoints) VALUES
(11, '12 Lý Thường Kiệt, Quận 10, TP.HCM',       0),
(12, '45 Nguyễn Trãi, Quận 5, TP.HCM',           0),
(13, '88 Điện Biên Phủ, Bình Thạnh, TP.HCM',     0),
(14, '7 Lê Văn Việt, TP. Thủ Đức, TP.HCM',       0),
(15, '101 Quang Trung, Gò Vấp, TP.HCM',          0),
(16, '23 Cộng Hòa, Tân Bình, TP.HCM',            0);
-- RewardPoints để 0: sẽ được trigger 2.2.2 cộng khi có thanh toán thành công

-- Manager trước (không có SupervisorID), rồi Cashier
INSERT INTO Staff (UserID, StartDate, Salary, Status, Position, CinemaID, SupervisorID) VALUES
(1, '2015-06-01', 32000000, 'Active', 'Manager', 1, NULL),
(2, '2017-03-15', 30000000, 'Active', 'Manager', 2, NULL),
(3, '2014-09-01', 31000000, 'Active', 'Manager', 3, NULL),
(4, '2019-01-10', 28000000, 'Active', 'Manager', 4, NULL),
(5, '2016-11-20', 29000000, 'Active', 'Manager', 5, NULL);

INSERT INTO Staff (UserID, StartDate, Salary, Status, Position, CinemaID, SupervisorID) VALUES
(6,  '2022-07-01', 8500000, 'Active',    'Cashier', 1, 1),
(7,  '2023-02-15', 8000000, 'Active',    'Cashier', 1, 1),
(8,  '2021-05-10', 9000000, 'Active',    'Cashier', 2, 2),
(9,  '2023-09-01', 7500000, 'Suspended', 'Cashier', 3, 3),
(10, '2020-12-01', 9500000, 'Resigned',  'Cashier', 4, 4);

-- ---------------------------------------------------------------------
-- MODULE 2 (Ca)
-- TODO(Ca): ScreeningRoom, Seat, Movie, Genre, MovieGenre, Actor, Perform,
--           PerformRole, Screening  (mỗi bảng >= 5 dòng)
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- MODULE 4 phần TicketCombo (Tài) — cần có trước Booking
-- TODO(Tài): TicketCombo
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- MODULE 3 (Hoàng)
-- TODO(Hoàng): Promotion, Booking, Ticket, Payment
--   Booking tại quầy dùng StaffID 6, 7, 8 (đang Active).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- MODULE 4 (Tài)
-- TODO(Tài): Product, SingleItem, FoodCombo, ComboDetail, OrderItem,
--            Review, MovieReview, ServiceReview
-- ---------------------------------------------------------------------
