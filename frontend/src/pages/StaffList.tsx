// Mục 3.2: Danh sách nhân viên lấy bằng thủ tục sp_ListStaff (P1, mục 2.3)
// Có tìm kiếm, lọc, sắp xếp; đổi trạng thái và xóa ngay trên danh sách
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { formatDate, formatMoney, request, toQuery } from '../api.ts'
import type { Cinema, Staff } from '../api.ts'
import type { Page } from '../App.tsx'

const DEFAULT_FILTERS = { keyword: '', cinemaId: '', position: '', status: '', sortBy: 'name' }
type Filters = typeof DEFAULT_FILTERS

const STATUS_COLOR: Record<string, string> = {
  Active: 'text-green-700',
  Suspended: 'text-amber-700',
  Resigned: 'text-slate-500',
}

type Props = { flash?: string; goTo: (p: Page) => void }

export default function StaffList({ flash, goTo }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [rows, setRows] = useState<Staff[]>([])
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(flash ?? '')

  // Gọi sp_ListStaff qua backend. Không xóa thông báo ở đây để lỗi của thao tác trước vẫn hiện
  async function load(f: Filters) {
    setLoading(true)
    try {
      setRows(await request<Staff[]>('/staff' + toQuery(f)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    request<Cinema[]>('/cinemas').then(setCinemas).catch(() => {})
    load(DEFAULT_FILTERS)
  }, [])

  // Combobox: lọc ngay khi đổi. Ô từ khóa: bấm Tìm hoặc Enter
  function changeFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value }
    setFilters(next)
    if (key !== 'keyword') { setError(''); load(next) }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (filters.keyword.length > 100) { setError('Từ khóa tối đa 100 ký tự'); return }
    setError('')
    load(filters)
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setError(''); setMessage('')
    load(DEFAULT_FILTERS)
  }

  // Bấm tiêu đề cột để sắp xếp
  function sortBy(col: 'name' | 'salary' | 'start_date') {
    let s: string = col
    if (col === 'salary') s = filters.sortBy === 'salary_asc' ? 'salary_desc' : 'salary_asc'
    changeFilter('sortBy', s)
  }
  const arrow = (col: string) => {
    if (filters.sortBy === col) return ' ▲'
    if (col === 'salary' && filters.sortBy === 'salary_asc') return ' ▲'
    if (col === 'salary' && filters.sortBy === 'salary_desc') return ' ▼'
    return ''
  }

  // Đổi trạng thái ngay trên danh sách -> sp_UpdateStaff
  async function changeStatus(row: Staff, status: string) {
    setError(''); setMessage('')
    try {
      await request(`/staff/${row.UserID}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: row.Name, birthDate: row.BirthDate, email: row.Email, phone: row.Phone,
          startDate: row.StartDate, salary: Number(row.Salary), position: row.Position,
          status, cinemaId: row.CinemaID, supervisorId: row.SupervisorID,
        }),
      })
      setMessage(`Đã đổi trạng thái của ${row.Name} thành ${status}`)
    } catch (err) {
      setError(`${row.Name}: ${(err as Error).message}`)
    }
    load(filters) // tải lại (nếu lỗi thì select trở về giá trị cũ)
  }

  // Xóa ngay trên danh sách -> sp_DeleteStaff
  async function remove(row: Staff) {
    if (!confirm(`Xóa vĩnh viễn nhân viên "${row.Name}"?`)) return
    setError(''); setMessage('')
    try {
      await request(`/staff/${row.UserID}`, { method: 'DELETE' })
      setMessage(`Đã xóa nhân viên ${row.Name}`)
      load(filters)
    } catch (err) {
      setError(`${row.Name}: ${(err as Error).message}`)
    }
  }

  const th = 'whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500'
  const td = 'px-3 py-2 border-t border-slate-100'

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Danh sách nhân viên</h2>
        <button className="btn-primary" onClick={() => goTo({ name: 'form' })}>+ Thêm nhân viên</button>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
        <input className="input min-w-60 flex-1" placeholder="Tìm theo tên, email, số điện thoại..."
               value={filters.keyword} onChange={(e) => changeFilter('keyword', e.target.value)} />
        <select className="input w-auto" value={filters.cinemaId} onChange={(e) => changeFilter('cinemaId', e.target.value)}>
          <option value="">Tất cả rạp</option>
          {cinemas.map((c) => <option key={c.CinemaID} value={c.CinemaID}>{c.CinemaName}</option>)}
        </select>
        <select className="input w-auto" value={filters.position} onChange={(e) => changeFilter('position', e.target.value)}>
          <option value="">Mọi chức vụ</option>
          <option value="Manager">Manager</option>
          <option value="Cashier">Cashier</option>
        </select>
        <select className="input w-auto" value={filters.status} onChange={(e) => changeFilter('status', e.target.value)}>
          <option value="">Mọi trạng thái</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Resigned">Resigned</option>
        </select>
        <select className="input w-auto" value={filters.sortBy} onChange={(e) => changeFilter('sortBy', e.target.value)}>
          <option value="name">Sắp xếp: Tên A→Z</option>
          <option value="salary_desc">Lương giảm dần</option>
          <option value="salary_asc">Lương tăng dần</option>
          <option value="start_date">Ngày vào làm</option>
        </select>
        <button className="btn-primary">Tìm</button>
        <button type="button" className="btn border-transparent" onClick={resetFilters}>Xóa lọc</button>
      </form>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">{message}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>#</th>
              <th className={`${th} cursor-pointer hover:text-slate-800`} onClick={() => sortBy('name')}>Họ tên{arrow('name')}</th>
              <th className={th}>Liên hệ</th>
              <th className={th}>Rạp</th>
              <th className={th}>Chức vụ</th>
              <th className={th}>Quản lý</th>
              <th className={`${th} cursor-pointer text-right hover:text-slate-800`} onClick={() => sortBy('salary')}>Lương{arrow('salary')}</th>
              <th className={`${th} cursor-pointer hover:text-slate-800`} onClick={() => sortBy('start_date')}>Vào làm{arrow('start_date')}</th>
              <th className={th}>Trạng thái</th>
              <th className={`${th} text-right`}>Booking đã xử lý</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="py-8 text-center text-slate-500">Đang tải...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={11} className="py-8 text-center text-slate-500">Không có nhân viên phù hợp</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.UserID} className="hover:bg-slate-50">
                <td className={td}>{r.UserID}</td>
                <td className={`${td} font-semibold`}>{r.Name}</td>
                <td className={td}>
                  <div>{r.Email}</div>
                  <div className="text-xs text-slate-500">{r.Phone}</div>
                </td>
                <td className={td}>{r.CinemaName}</td>
                <td className={td}>{r.Position}</td>
                <td className={td}>{r.SupervisorName ?? '—'}</td>
                <td className={`${td} whitespace-nowrap text-right`}>{formatMoney(r.Salary)}</td>
                <td className={td}>{formatDate(r.StartDate)}</td>
                <td className={td}>
                  <select value={r.Status} onChange={(e) => changeStatus(r, e.target.value)}
                          className={`rounded border border-slate-300 px-2 py-1 text-xs font-semibold ${STATUS_COLOR[r.Status]}`}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </td>
                <td className={`${td} text-right`}>{r.ProcessedBookings}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <button className="btn px-2 py-1 text-xs" onClick={() => goTo({ name: 'form', editId: r.UserID })}>Sửa</button>{' '}
                  <button className="btn-danger px-2 py-1 text-xs" onClick={() => remove(r)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">{rows.length} nhân viên</p>
    </div>
  )
}
