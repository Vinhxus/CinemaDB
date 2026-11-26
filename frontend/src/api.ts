// Gọi backend + kiểu dữ liệu dùng chung

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export type Staff = {
  UserID: number
  Name: string
  BirthDate: string
  Email: string
  Phone: string
  StartDate: string
  Salary: string | number
  Status: 'Active' | 'Suspended' | 'Resigned'
  Position: 'Cashier' | 'Manager'
  CinemaID: number
  CinemaName?: string
  SupervisorID: number | null
  SupervisorName?: string | null
  ProcessedBookings?: number
}

export type Cinema = { CinemaID: number; CinemaName: string }
export type Manager = { UserID: number; Name: string; Salary: string }
export type Genre = { GenreID: number; GenreName: string }
export type Room = { CinemaID: number; RoomNumber: number; RoomType: string; Capacity: number }

// ---- Xem toàn bộ database (/api/schema, /api/tables/:name) ----
export type TableGroup = {
  key: string
  title: string
  owner: string
  tables: { name: string; rows: number | null }[]   // rows = null: bảng chưa được tạo
}
export type DbRoutine = { name: string; type: 'PROCEDURE' | 'FUNCTION' }
export type DbTrigger = { name: string; timing: string; event: string; tableName: string }
export type SchemaInfo = { groups: TableGroup[]; routines: DbRoutine[]; triggers: DbTrigger[] }

export type ColumnInfo = {
  name: string
  type: string
  nullable: 'YES' | 'NO'
  defaultValue: string | null
  extra: string
  primaryKey: boolean
  unique: boolean
  derived: boolean
  references: { table: string; column: string }[]
}
export type TableData = {
  table: string
  columns: ColumnInfo[]
  hiddenColumns: string[]
  checks: { name: string; clause: string }[]
  triggers: { name: string; timing: string; event: string }[]
  rows: Record<string, unknown>[]
}

// Gọi API; nếu lỗi thì ném ra đúng thông báo backend trả về
// (chính là MESSAGE_TEXT của SIGNAL trong procedure/trigger)
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error('Không kết nối được backend. Hãy chạy "npm run dev" trong thư mục backend.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`)
  return data as T
}

// Tạo query string, bỏ qua giá trị rỗng
export function toQuery(params: Record<string, string>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== '' && q.append(k, v))
  return q.toString() ? '?' + q.toString() : ''
}

export const formatMoney = (v: string | number) => Number(v).toLocaleString('vi-VN') + ' đ'
export const formatDate = (d: string) => (d ? d.split('-').reverse().join('/') : '')
