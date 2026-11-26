# Cinema Ticketing System — Assignment 2 (CC06 - Nhóm 4)

MySQL + Node.js/Express + React (Vite, TypeScript, Tailwind CSS).

## Cấu trúc

```
cinemaDB/
├── database/              Chạy theo thứ tự số
│   ├── 01_schema.sql        Tạo bảng + ràng buộc           (1.1)
│   ├── 02_triggers.sql      Trigger                         (1.1, 2.2)
│   ├── 03_procedures.sql    Thủ tục                         (2.1, 2.3)
│   ├── 04_functions.sql     Hàm                             (2.4)
│   ├── 05_sample_data.sql   Dữ liệu mẫu                     (1.2)
│   └── demo.sql             Câu lệnh demo khi thuyết trình
├── backend/
│   ├── server.js            Tất cả API
│   └── db.js                Kết nối MySQL
└── frontend/
    └── src/
        ├── App.tsx          Thanh menu, chuyển trang
        ├── api.ts           Hàm gọi backend + kiểu dữ liệu
        ├── index.css        Tailwind
        └── pages/
            ├── Overview.tsx     Tổng quan: số dòng mỗi bảng, trigger, thủ tục, hàm
            ├── DataBrowser.tsx  Xem dữ liệu + cấu trúc của mọi bảng (chỉ đọc)
            ├── StaffList.tsx    Danh sách nhân viên       (3.2)
            ├── StaffForm.tsx    Thêm / sửa / xóa           (3.1)
            └── Reports.tsx      Gọi thủ tục / hàm khác     (3.3)
```

## Cài đặt và chạy

Yêu cầu: MySQL 8.0.16+ và Node.js 20+.

**1. Database:** mở MySQL Workbench, lần lượt mở và chạy (⚡) các file `database/01` → `05`.
Mỗi lần sửa SQL thì chạy lại từ file 01 (file 01 xóa và tạo lại DB).

**2. Backend**
```bash
cd backend
copy .env.example .env      # rồi mở .env điền mật khẩu MySQL vào DB_PASS
npm install
npm run dev                 # mở http://localhost:5000/api/health phải thấy "ok": true
```

**3. Frontend** (mở terminal khác)
```bash
cd frontend
npm install
npm run dev                 # mở http://localhost:5173
```

## Phân công

| Thành viên | Bảng + ràng buộc | Phần 2 | Phần 3 |
|---|---|---|---|
| Vinh (M1) | Users, Client, Staff, Cinema | 2.1 Insert/Update/DeleteStaff, 2.3 P1 sp_ListStaff | Khung app, 3.1 |
| Ca (M2) | Movie, Genre, Actor, ScreeningRoom, Seat, Screening… | 2.2.1 trigger suất chiếu, 2.4 F1 | 3.2 |
| Hoàng (M3) | Booking, Ticket, Payment, Promotion | 2.2.2 trigger TotalAmount → EarnedPoints → RewardPoints | Demo, ghép SQL, kiểm thử |
| Tài (M4) | Product, Combo, TicketCombo, OrderItem, Review… | 2.3 P2, 2.4 F2 | 3.3 |

Việc còn lại được đánh dấu `TODO(Tên)` trong code — tìm `TODO(` để thấy phần của mình.

## Quy ước

- Mỗi người làm trên nhánh riêng, xong mở Pull Request vào `main`.
- Ràng buộc viết được bằng CHECK/FK/UNIQUE thì để ở `01_schema.sql`, không dùng trigger.
- Báo lỗi trong SQL: `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '<thông báo cụ thể>'`.
  Backend gửi nguyên thông báo này lên giao diện.
- Thêm/sửa/xóa trên giao diện bắt buộc gọi thủ tục ở mục 2.1 (đề yêu cầu).
- Không commit file `.env` và thư mục `node_modules`.
# CinemaDB
