-- =====================================================================
-- 01_schema.sql  —  Cinema Ticketing System (CC06 - Group 4)
-- DBMS: MySQL 8.0.16+  (cần bản có hỗ trợ CHECK)
-- Chạy file này ĐẦU TIÊN. File sẽ xóa và tạo lại database cinema.
--
-- Đã áp dụng các sửa đổi so với Ass1 theo góp ý của thầy:
--   * Mọi quan hệ tham gia toàn phần -> cột NOT NULL
--   * Email, Phone là khóa dự tuyển (UNIQUE NOT NULL)
--   * Khóa riêng phần của Seat là cặp (SeatRow, SeatNumber)
--   * Staff.SupervisorID chỉ NULL khi Position = 'Manager' (CHECK)
--   * Thêm bảng TicketCombo đầy đủ; Product chỉ có 2 lớp con
--   * Review có BookingID NOT NULL; bỏ AverageScore khỏi MovieReview
--   * NGOẠI LỆ so với Ass1: Booking.TotalAmount và Booking.EarnedPoints
--     được LƯU thành cột thật để trigger 2.2.2 tính toán.
--
-- Quy ước: ràng buộc nào viết được bằng PK/FK/UNIQUE/CHECK thì viết ở đây,
-- KHÔNG dùng trigger. Ràng buộc liên bảng nằm ở 02_triggers.sql.
-- Bảng người dùng đặt tên là Users (vì USER là từ khóa của MySQL).
-- =====================================================================

DROP DATABASE IF EXISTS cinema;
CREATE DATABASE cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema;

-- ---------------------------------------------------------------------
-- MODULE 1: USER  (Vinh)
-- ---------------------------------------------------------------------
CREATE TABLE Cinema (
    CinemaID    INT AUTO_INCREMENT PRIMARY KEY,
    CinemaName  VARCHAR(100) NOT NULL UNIQUE,
    Address     VARCHAR(255) NOT NULL
);

CREATE TABLE Users (
    UserID          INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    BirthDate       DATE         NOT NULL,
    Email           VARCHAR(100) NOT NULL,
    Phone           VARCHAR(15)  NOT NULL,
    HashedPassword  CHAR(64)     NOT NULL,          -- SHA-256 hex, không lưu mật khẩu gốc
    UserType        VARCHAR(10)  NOT NULL,
    CONSTRAINT uq_users_email UNIQUE (Email),       -- RB4: khóa dự tuyển
    CONSTRAINT uq_users_phone UNIQUE (Phone),       -- RB4: khóa dự tuyển
    CONSTRAINT chk_users_type  CHECK (UserType IN ('Client','Staff')),
    CONSTRAINT chk_users_email CHECK (Email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_phone CHECK (Phone REGEXP '^0[0-9]{9}$')
);

CREATE TABLE Client (
    UserID        INT PRIMARY KEY,
    Address       VARCHAR(255),
    RewardPoints  INT NOT NULL DEFAULT 0,
    -- MembershipTier là thuộc tính dẫn xuất từ RewardPoints, không lưu
    CONSTRAINT fk_client_user FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT chk_client_points CHECK (RewardPoints >= 0)
);

CREATE TABLE Staff (
    UserID        INT PRIMARY KEY,
    StartDate     DATE          NOT NULL,
    Salary        DECIMAL(12,0) NOT NULL,
    Status        VARCHAR(10)   NOT NULL DEFAULT 'Active',
    Position      VARCHAR(10)   NOT NULL,
    CinemaID      INT           NOT NULL,           -- Work_at: tham gia toàn phần
    SupervisorID  INT           NULL,               -- Manage (đệ quy)
    CONSTRAINT fk_staff_user       FOREIGN KEY (UserID)       REFERENCES Users(UserID),
    CONSTRAINT fk_staff_cinema     FOREIGN KEY (CinemaID)     REFERENCES Cinema(CinemaID),
    CONSTRAINT fk_staff_supervisor FOREIGN KEY (SupervisorID) REFERENCES Staff(UserID),
    CONSTRAINT chk_staff_salary   CHECK (Salary > 0),
    CONSTRAINT chk_staff_status   CHECK (Status IN ('Active','Suspended','Resigned')),
    CONSTRAINT chk_staff_position CHECK (Position IN ('Cashier','Manager')),
    -- RB1: Manager không có người quản lý, Cashier bắt buộc có
    CONSTRAINT chk_staff_supervisor CHECK (
        (Position = 'Manager' AND SupervisorID IS NULL) OR
        (Position = 'Cashier' AND SupervisorID IS NOT NULL)),
    CONSTRAINT chk_staff_not_self CHECK (SupervisorID IS NULL OR SupervisorID <> UserID)
);

-- ---------------------------------------------------------------------
-- MODULE 2: CINEMA AND MOVIE  (Ca)
-- ---------------------------------------------------------------------
CREATE TABLE ScreeningRoom (
    CinemaID    INT          NOT NULL,
    RoomNumber  INT          NOT NULL,
    RoomType    VARCHAR(20)  NOT NULL,
    Capacity    INT          NOT NULL,
    PRIMARY KEY (CinemaID, RoomNumber),
    CONSTRAINT fk_room_cinema FOREIGN KEY (CinemaID) REFERENCES Cinema(CinemaID),
    CONSTRAINT chk_room_number   CHECK (RoomNumber > 0),
    CONSTRAINT chk_room_capacity CHECK (Capacity > 0),
    CONSTRAINT chk_room_type     CHECK (RoomType IN ('Standard','IMAX','4DX','Gold Class'))
);

CREATE TABLE Seat (
    CinemaID    INT         NOT NULL,
    RoomNumber  INT         NOT NULL,
    SeatRow     CHAR(1)     NOT NULL,
    SeatNumber  INT         NOT NULL,
    SeatType    VARCHAR(10) NOT NULL,
    PRIMARY KEY (CinemaID, RoomNumber, SeatRow, SeatNumber),   -- khóa riêng phần ghép (SeatRow, SeatNumber)
    CONSTRAINT fk_seat_room FOREIGN KEY (CinemaID, RoomNumber) REFERENCES ScreeningRoom(CinemaID, RoomNumber),
    CONSTRAINT chk_seat_row    CHECK (SeatRow REGEXP '^[A-Z]$'),
    CONSTRAINT chk_seat_number CHECK (SeatNumber > 0),
    CONSTRAINT chk_seat_type   CHECK (SeatType IN ('Standard','VIP','Couple'))
);

CREATE TABLE Movie (
    MovieID      INT AUTO_INCREMENT PRIMARY KEY,
    Title        VARCHAR(200) NOT NULL,
    Duration     INT          NOT NULL,             -- phút
    ReleaseDate  DATE         NOT NULL,
    Description  TEXT,
    AgeRating    VARCHAR(5)   NOT NULL,
    Language     VARCHAR(50)  NOT NULL,
    CONSTRAINT chk_movie_duration CHECK (Duration > 0),        -- RB4 (M2)
    CONSTRAINT chk_movie_rating   CHECK (AgeRating IN ('P','K','T13','T16','T18'))
);

CREATE TABLE Genre (
    GenreID      INT AUTO_INCREMENT PRIMARY KEY,
    GenreName    VARCHAR(50) NOT NULL UNIQUE,
    Description  VARCHAR(255)
);

CREATE TABLE MovieGenre (
    MovieID  INT NOT NULL,
    GenreID  INT NOT NULL,
    PRIMARY KEY (MovieID, GenreID),
    CONSTRAINT fk_mg_movie FOREIGN KEY (MovieID) REFERENCES Movie(MovieID),
    CONSTRAINT fk_mg_genre FOREIGN KEY (GenreID) REFERENCES Genre(GenreID)
);

CREATE TABLE Actor (
    ActorID      INT AUTO_INCREMENT PRIMARY KEY,
    ActorName    VARCHAR(100) NOT NULL,
    DateOfBirth  DATE
    -- RB5 (M2): DateOfBirth <= ngày hiện tại. MySQL không cho CURDATE() trong CHECK -> trigger
);

CREATE TABLE Perform (
    MovieID  INT NOT NULL,
    ActorID  INT NOT NULL,
    PRIMARY KEY (MovieID, ActorID),
    CONSTRAINT fk_perform_movie FOREIGN KEY (MovieID) REFERENCES Movie(MovieID),
    CONSTRAINT fk_perform_actor FOREIGN KEY (ActorID) REFERENCES Actor(ActorID)
);

CREATE TABLE PerformRole (
    MovieID  INT          NOT NULL,
    ActorID  INT          NOT NULL,
    Role     VARCHAR(100) NOT NULL,
    PRIMARY KEY (MovieID, ActorID, Role),
    CONSTRAINT fk_role_perform FOREIGN KEY (MovieID, ActorID) REFERENCES Perform(MovieID, ActorID)
);

CREATE TABLE Screening (
    CinemaID    INT        NOT NULL,
    RoomNumber  INT        NOT NULL,
    ScreenDate  DATE       NOT NULL,
    StartTime   TIME       NOT NULL,
    MovieID     INT        NOT NULL,                -- tham gia toàn phần
    Format      VARCHAR(5) NOT NULL,
    -- EndTime là thuộc tính dẫn xuất (StartTime + Movie.Duration), không lưu
    PRIMARY KEY (CinemaID, RoomNumber, ScreenDate, StartTime),
    CONSTRAINT fk_screening_room  FOREIGN KEY (CinemaID, RoomNumber) REFERENCES ScreeningRoom(CinemaID, RoomNumber),
    CONSTRAINT fk_screening_movie FOREIGN KEY (MovieID) REFERENCES Movie(MovieID),
    CONSTRAINT chk_screening_format CHECK (Format IN ('2D','3D'))
);

-- ---------------------------------------------------------------------
-- MODULE 4 (phần cần tạo trước Booking): TicketCombo  (Tài)
-- ---------------------------------------------------------------------
CREATE TABLE TicketCombo (
    TicketComboID  INT AUTO_INCREMENT PRIMARY KEY,
    ComboName      VARCHAR(100)  NOT NULL,
    StartDate      DATE          NOT NULL,
    EndDate        DATE          NOT NULL,
    Format         VARCHAR(5)    NOT NULL,
    SeatType       VARCHAR(10)   NOT NULL,
    SeatCount      INT           NOT NULL,
    ComboPrice     DECIMAL(12,0) NOT NULL,
    CONSTRAINT chk_tc_dates     CHECK (StartDate <= EndDate),              -- RB3 (M4)
    CONSTRAINT chk_tc_format    CHECK (Format IN ('2D','3D')),
    CONSTRAINT chk_tc_seattype  CHECK (SeatType IN ('Standard','VIP','Couple')),
    CONSTRAINT chk_tc_seatcount CHECK (SeatCount > 0),
    CONSTRAINT chk_tc_price     CHECK (ComboPrice >= 0)                    -- RB1 (M4)
);

-- ---------------------------------------------------------------------
-- MODULE 3: BOOKING AND PAYMENT  (Hoàng)
-- ---------------------------------------------------------------------
CREATE TABLE Promotion (
    PromotionID    INT AUTO_INCREMENT PRIMARY KEY,
    PromoCode      VARCHAR(20)   NOT NULL UNIQUE,
    PromotionName  VARCHAR(100)  NOT NULL,
    DiscountType   VARCHAR(10)   NOT NULL,
    DiscountValue  DECIMAL(12,2) NOT NULL,
    StartDate      DATE          NOT NULL,
    EndDate        DATE          NOT NULL,
    UsageLimit     INT           NOT NULL,
    CONSTRAINT chk_promo_type  CHECK (DiscountType IN ('Percentage','Fixed')),
    CONSTRAINT chk_promo_value CHECK (DiscountValue > 0 AND (DiscountType <> 'Percentage' OR DiscountValue <= 100)),  -- RB7
    CONSTRAINT chk_promo_dates CHECK (StartDate <= EndDate),                                                      -- RB7
    CONSTRAINT chk_promo_limit CHECK (UsageLimit > 0)
);

CREATE TABLE Booking (
    BookingID      INT AUTO_INCREMENT PRIMARY KEY,
    ClientID       INT           NOT NULL,          -- Place: tham gia toàn phần
    StaffID        INT           NULL,              -- Process: chỉ có khi bán tại quầy
    PromotionID    INT           NULL,              -- Apply
    TicketComboID  INT           NULL,              -- Use
    BookingTime    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Channel        VARCHAR(10)   NOT NULL,
    Status         VARCHAR(10)   NOT NULL DEFAULT 'Holding',
    TotalAmount    DECIMAL(12,0) NOT NULL DEFAULT 0, -- dẫn xuất, do trigger 2.2.2 cập nhật
    EarnedPoints   INT           NULL,               -- dẫn xuất, chỉ có giá trị khi đã thanh toán
    CONSTRAINT fk_booking_client FOREIGN KEY (ClientID)      REFERENCES Client(UserID),
    CONSTRAINT fk_booking_staff  FOREIGN KEY (StaffID)       REFERENCES Staff(UserID),
    CONSTRAINT fk_booking_promo  FOREIGN KEY (PromotionID)   REFERENCES Promotion(PromotionID),
    CONSTRAINT fk_booking_combo  FOREIGN KEY (TicketComboID) REFERENCES TicketCombo(TicketComboID),
    CONSTRAINT chk_booking_channel CHECK (Channel IN ('Online','Counter')),
    CONSTRAINT chk_booking_status  CHECK (Status IN ('Holding','Paid','Cancelled','Expired')),
    CONSTRAINT chk_booking_staff   CHECK ((Channel = 'Counter' AND StaffID IS NOT NULL) OR
                                          (Channel = 'Online'  AND StaffID IS NULL)),
    CONSTRAINT chk_booking_total   CHECK (TotalAmount >= 0),
    CONSTRAINT chk_booking_points  CHECK (EarnedPoints IS NULL OR EarnedPoints >= 0)
);

CREATE TABLE Ticket (
    BookingID       INT           NOT NULL,         -- Include: quan hệ xác định
    TicketNo        INT           NOT NULL,
    CinemaID        INT           NOT NULL,         -- dùng chung cho khóa Seat và khóa Screening
    RoomNumber      INT           NOT NULL,         --   => tự đảm bảo RB2 (ghế thuộc đúng phòng của suất chiếu)
    SeatRow         CHAR(1)       NOT NULL,
    SeatNumber      INT           NOT NULL,
    ScreenDate      DATE          NOT NULL,
    StartTime       TIME          NOT NULL,
    Price           DECIMAL(12,0) NOT NULL,
    Status          VARCHAR(12)   NOT NULL DEFAULT 'Valid',
    CheckInTime     DATETIME      NULL,
    CheckInStaffID  INT           NULL,             -- Check
    PRIMARY KEY (BookingID, TicketNo),
    CONSTRAINT fk_ticket_booking   FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    CONSTRAINT fk_ticket_seat      FOREIGN KEY (CinemaID, RoomNumber, SeatRow, SeatNumber)
                                   REFERENCES Seat(CinemaID, RoomNumber, SeatRow, SeatNumber),
    CONSTRAINT fk_ticket_screening FOREIGN KEY (CinemaID, RoomNumber, ScreenDate, StartTime)
                                   REFERENCES Screening(CinemaID, RoomNumber, ScreenDate, StartTime),
    CONSTRAINT fk_ticket_checker   FOREIGN KEY (CheckInStaffID) REFERENCES Staff(UserID),
    CONSTRAINT chk_ticket_no      CHECK (TicketNo > 0),
    CONSTRAINT chk_ticket_price   CHECK (Price >= 0),                                         -- RB7
    CONSTRAINT chk_ticket_status  CHECK (Status IN ('Valid','CheckedIn','Exchanged','Cancelled')),
    CONSTRAINT chk_ticket_checkin CHECK ((Status = 'CheckedIn' AND CheckInTime IS NOT NULL) OR   -- RB7
                                         (Status <> 'CheckedIn' AND CheckInTime IS NULL))
);

CREATE TABLE Payment (
    PaymentID       INT AUTO_INCREMENT PRIMARY KEY,
    BookingID       INT           NOT NULL,         -- Pay
    Amount          DECIMAL(12,0) NOT NULL,
    Method          VARCHAR(10)   NOT NULL,
    Partner         VARCHAR(30)   NULL,
    Status          VARCHAR(10)   NOT NULL DEFAULT 'Pending',
    PaymentTime     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TransactionRef  VARCHAR(50)   NULL UNIQUE,
    CONSTRAINT fk_payment_booking FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    CONSTRAINT chk_payment_amount CHECK (Amount >= 0),
    CONSTRAINT chk_payment_method CHECK (Method IN ('EWallet','Card','Cash')),
    CONSTRAINT chk_payment_status CHECK (Status IN ('Pending','Success','Failed')),
    CONSTRAINT chk_payment_cash   CHECK ((Method = 'Cash' AND Partner IS NULL AND TransactionRef IS NULL) OR
                                         (Method <> 'Cash' AND Partner IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- MODULE 4: COMBO AND FEEDBACK  (Tài)
-- ---------------------------------------------------------------------
CREATE TABLE Product (
    ProductID    INT AUTO_INCREMENT PRIMARY KEY,
    ProductName  VARCHAR(100)  NOT NULL,
    Description  VARCHAR(255),
    Price        DECIMAL(12,0) NOT NULL,
    ImageURL     VARCHAR(255),
    ProductType  VARCHAR(10)   NOT NULL,
    CONSTRAINT chk_product_price CHECK (Price >= 0),                                  -- RB1
    CONSTRAINT chk_product_type  CHECK (ProductType IN ('FoodCombo','SingleItem'))
);

CREATE TABLE SingleItem (
    ProductID  INT PRIMARY KEY,
    Category   VARCHAR(20) NOT NULL,
    Size       VARCHAR(5),
    Flavor     VARCHAR(50),
    CONSTRAINT fk_single_product FOREIGN KEY (ProductID) REFERENCES Product(ProductID),
    CONSTRAINT chk_single_category CHECK (Category IN ('Popcorn','Drink','Snack')),
    CONSTRAINT chk_single_size     CHECK (Size IS NULL OR Size IN ('S','M','L'))
);

CREATE TABLE FoodCombo (
    ProductID      INT PRIMARY KEY,
    StartDate      DATE          NOT NULL,
    EndDate        DATE          NOT NULL,
    DiscountPrice  DECIMAL(12,0) NOT NULL,
    CONSTRAINT fk_foodcombo_product FOREIGN KEY (ProductID) REFERENCES Product(ProductID),
    CONSTRAINT chk_foodcombo_dates CHECK (StartDate <= EndDate),                       -- RB3
    CONSTRAINT chk_foodcombo_price CHECK (DiscountPrice >= 0)                          -- RB1
    -- DiscountPrice <= Product.Price: so sánh 2 bảng -> trigger
);

CREATE TABLE ComboDetail (
    FoodComboID   INT NOT NULL,
    SingleItemID  INT NOT NULL,                     -- chỉ tham chiếu SingleItem => RB2 (không lồng combo)
    Quantity      INT NOT NULL,
    PRIMARY KEY (FoodComboID, SingleItemID),
    CONSTRAINT fk_cd_combo FOREIGN KEY (FoodComboID)  REFERENCES FoodCombo(ProductID),
    CONSTRAINT fk_cd_item  FOREIGN KEY (SingleItemID) REFERENCES SingleItem(ProductID),
    CONSTRAINT chk_cd_qty CHECK (Quantity > 0)
);

CREATE TABLE OrderItem (
    BookingID  INT           NOT NULL,
    ProductID  INT           NOT NULL,
    Quantity   INT           NOT NULL,
    UnitPrice  DECIMAL(12,0) NOT NULL,              -- giá tại thời điểm mua
    PRIMARY KEY (BookingID, ProductID),
    CONSTRAINT fk_oi_booking FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    CONSTRAINT fk_oi_product FOREIGN KEY (ProductID) REFERENCES Product(ProductID),
    CONSTRAINT chk_oi_qty   CHECK (Quantity > 0),
    CONSTRAINT chk_oi_price CHECK (UnitPrice >= 0)
);

CREATE TABLE Review (
    ReviewID    INT AUTO_INCREMENT PRIMARY KEY,
    ClientID    INT         NOT NULL,               -- Write
    BookingID   INT         NOT NULL,               -- Based_on (bằng chứng đã mua)
    Comment     TEXT,
    CreatedAt   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ReviewType  VARCHAR(10) NOT NULL,
    CONSTRAINT fk_review_client  FOREIGN KEY (ClientID)  REFERENCES Client(UserID),
    CONSTRAINT fk_review_booking FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
    CONSTRAINT chk_review_type CHECK (ReviewType IN ('Movie','Service'))
);

CREATE TABLE MovieReview (
    ReviewID   INT PRIMARY KEY,
    MovieID    INT NOT NULL,                        -- About
    Score      INT NOT NULL,
    LikeCount  INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_mr_review FOREIGN KEY (ReviewID) REFERENCES Review(ReviewID),
    CONSTRAINT fk_mr_movie  FOREIGN KEY (MovieID)  REFERENCES Movie(MovieID),
    CONSTRAINT chk_mr_score CHECK (Score BETWEEN 1 AND 5),                             -- RB8
    CONSTRAINT chk_mr_like  CHECK (LikeCount >= 0)                                     -- RB8
);

CREATE TABLE ServiceReview (
    ReviewID  INT PRIMARY KEY,
    CinemaID  INT         NOT NULL,                 -- Rate
    Score     INT         NOT NULL,
    Status    VARCHAR(10) NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_sr_review FOREIGN KEY (ReviewID) REFERENCES Review(ReviewID),
    CONSTRAINT fk_sr_cinema FOREIGN KEY (CinemaID) REFERENCES Cinema(CinemaID),
    CONSTRAINT chk_sr_score  CHECK (Score BETWEEN 1 AND 5),                            -- RB8
    CONSTRAINT chk_sr_status CHECK (Status IN ('Pending','Published','Hidden'))
);
