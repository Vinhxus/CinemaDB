-- =====================================================================
-- 05_sample_data.sql  —  Dữ liệu mẫu (mỗi bảng >= 5 dòng)
-- Chạy SAU CÙNG để các trigger kiểm tra luôn dữ liệu mẫu.
-- Mật khẩu mẫu của mọi tài khoản: 123456
-- =====================================================================
USE cinema;

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
-- ---------------------------------------------------------------------
INSERT INTO ScreeningRoom (CinemaID, RoomNumber, RoomType, Capacity) VALUES
(1, 1, 'Standard',   0),
(1, 2, 'IMAX',       0),
(2, 1, '4DX',        0),
(3, 1, 'Gold Class', 0),
(4, 1, 'Standard',   0);

INSERT INTO Seat (CinemaID, RoomNumber, SeatRow, SeatNumber, SeatType) VALUES
(1, 1, 'A', 1, 'Standard'),
(1, 1, 'A', 2, 'Standard'),
(1, 2, 'A', 1, 'VIP'),
(2, 1, 'A', 1, 'Couple'),
(3, 1, 'A', 1, 'VIP');

INSERT INTO Movie (MovieID, Title, Duration, ReleaseDate, Description, AgeRating, Language) VALUES
(1, N'Chuyến Tàu Cuối',          110, '2024-01-12', N'Một nhà báo lần theo manh mối trên chuyến tàu đêm.', 'T13', N'Tiếng Việt'),
(2, N'Mùa Hè Ở Hội An',           95, '2024-03-08', N'Hai người bạn mở lại tiệm ảnh cũ của gia đình.',      'P',   N'Tiếng Việt'),
(3, N'Vượt Qua Tầng Mây',        120, '2024-05-17', N'Một phi công dẫn đội cứu hộ qua vùng núi.',           'T13', N'Tiếng Việt'),
(4, N'Bản Đồ Của Biển',          105, '2024-07-19', N'Một thợ lặn tìm lại bản đồ của cha mình.',             'K',   N'Tiếng Việt'),
(5, N'Thành Phố Không Ngủ',      100, '2024-09-06', N'Một nhạc công đi tìm cảm hứng dọc những con phố đêm.', 'T16', N'Tiếng Việt');

INSERT INTO Genre (GenreID, GenreName, Description) VALUES
(1, N'Bí ẩn',       N'Câu chuyện xoay quanh việc giải mã bí ẩn.'),
(2, N'Hài',         N'Câu chuyện có tình huống hài hước.'),
(3, N'Hành động',   N'Câu chuyện có các pha hành động và cứu hộ.'),
(4, N'Phiêu lưu',   N'Câu chuyện về hành trình khám phá.'),
(5, N'Chính kịch',  N'Câu chuyện tập trung vào những lựa chọn của nhân vật.');

INSERT INTO MovieGenre (MovieID, GenreID) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

INSERT INTO Actor (ActorID, ActorName, DateOfBirth) VALUES
(1, N'Nguyễn Minh An',  '1986-02-14'),
(2, N'Lê Ngọc Hân',     '1994-06-21'),
(3, N'Trần Gia Bảo',    '1989-11-03'),
(4, N'Phạm Thùy Linh',  '1997-04-18'),
(5, N'Võ Hoàng Sơn',    '1991-09-27');

INSERT INTO Perform (MovieID, ActorID) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

INSERT INTO PerformRole (MovieID, ActorID, Role) VALUES
(1, 1, N'Nhà báo Khải'),
(2, 2, N'Nhiếp ảnh gia Mai'),
(3, 3, N'Phi công Duy'),
(4, 4, N'Thợ lặn Vy'),
(5, 5, N'Nhạc công Nam');

SET @module2_screen_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY);

INSERT INTO Screening (CinemaID, RoomNumber, ScreenDate, StartTime, MovieID, Format) VALUES
(1, 1, @module2_screen_date, '10:00:00', 1, '2D'),
(1, 1, @module2_screen_date, '11:50:00', 2, '2D'),
(1, 2, @module2_screen_date, '10:00:00', 3, '3D'),
(2, 1, @module2_screen_date, '14:00:00', 4, '3D'),
(3, 1, @module2_screen_date, '18:30:00', 5, '2D');


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
