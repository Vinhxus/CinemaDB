// Mục 3.1: Thêm / sửa / xóa nhân viên
// Mọi thao tác gọi backend -> sp_InsertStaff / sp_UpdateStaff / sp_DeleteStaff (mục 2.1)
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { request } from '../api.ts'
import type { Cinema, Manager, Staff } from '../api.ts'
import type { Page } from '../App.tsx'

type Form = {
  name: string
  birthDate: string
  email: string
  phone: string
  password: string
  startDate: string
  salary: string
  position: string
  status: string
  cinemaId: string
  supervisorId: string
}

const EMPTY: Form = {
  name: '', birthDate: '', email: '', phone: '', password: '',
  startDate: '', salary: '', position: 'Cashier', status: 'Active',
  cinemaId: '', supervisorId: '',
}

function ageAt(birth: string, at: string) {
  const b = new Date(birth)
  const a = new Date(at)
  let age = a.getFullYear() - b.getFullYear()
  const m = a.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--
  return age
}

// Kiểm tra ở giao diện (procedure vẫn kiểm tra lại toàn bộ)
function validate(f: Form, isEdit: boolean) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (!f.name.trim()) e.name = 'Vui lòng nhập họ tên'
  if (!f.birthDate) e.birthDate = 'Vui lòng chọn ngày sinh'
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(f.email)) e.email = 'Email không đúng định dạng (vd: ten@gmail.com)'
  if (!/^0\d{9}$/.test(f.phone)) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
  if (!isEdit && f.password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự'
  if (!f.startDate) e.startDate = 'Vui lòng chọn ngày bắt đầu'
  else if (f.birthDate && ageAt(f.birthDate, f.startDate) < 18) e.startDate = 'Nhân viên phải đủ 18 tuổi tính đến ngày bắt đầu'
  if (!(Number(f.salary) > 0)) e.salary = 'Lương phải là số lớn hơn 0'
  if (!f.cinemaId) e.cinemaId = 'Vui lòng chọn rạp'
  if (f.position === 'Cashier' && !f.supervisorId) e.supervisorId = 'Cashier phải có người quản lý'
  return e
}

type Props = { editId?: number; goTo: (p: Page) => void }

export default function StaffForm({ editId, goTo }: Props) {
  const isEdit = editId !== undefined
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [saving, setSaving] = useState(false)

  // Tải danh sách rạp, và dữ liệu nhân viên nếu đang sửa
  useEffect(() => {
    request<Cinema[]>('/cinemas').then(setCinemas).catch((e) => setServerError(e.message))
    if (isEdit) {
      request<Staff>(`/staff/${editId}`)
        .then((s) => setForm({
          name: s.Name, birthDate: s.BirthDate, email: s.Email, phone: s.Phone, password: '',
          startDate: s.StartDate, salary: String(s.Salary), position: s.Position, status: s.Status,
          cinemaId: String(s.CinemaID), supervisorId: s.SupervisorID ? String(s.SupervisorID) : '',
        }))
        .catch((e) => setServerError(e.message))
    }
  }, [editId, isEdit])

  // Danh sách Manager đang Active của rạp đã chọn
  useEffect(() => {
    if (!form.cinemaId || form.position !== 'Cashier') { setManagers([]); return }
    request<Manager[]>(`/managers?cinemaId=${form.cinemaId}`)
      .then((list) => setManagers(list.filter((m) => m.UserID !== editId)))
      .catch((e) => setServerError(e.message))
  }, [form.cinemaId, form.position, editId])

  function change(field: keyof Form, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'cinemaId' || (field === 'position' && value === 'Manager')) next.supervisorId = ''
      return next
    })
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setServerError(''); setSuccess('')
    const e = validate(form, isEdit)
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const body = JSON.stringify({
      ...form,
      name: form.name.trim(),
      salary: Number(form.salary),
      cinemaId: Number(form.cinemaId),
      supervisorId: form.position === 'Cashier' ? Number(form.supervisorId) : null,
    })
    setSaving(true)
    try {
      if (isEdit) {
        const r = await request<{ message: string }>(`/staff/${editId}`, { method: 'PUT', body })
        setSuccess(r.message)
      } else {
        const r = await request<{ message: string; userId: number }>('/staff', { method: 'POST', body })
        setSuccess(`${r.message} (mã ${r.userId})`)
        setForm(EMPTY)
      }
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Xóa vĩnh viễn nhân viên "${form.name}"?\nChỉ xóa được nhân viên đã nghỉ việc và chưa có giao dịch.`)) return
    setServerError(''); setSuccess('')
    try {
      await request(`/staff/${editId}`, { method: 'DELETE' })
      goTo({ name: 'list', flash: `Đã xóa nhân viên ${form.name}` })
    } catch (err) {
      setServerError((err as Error).message)
    }
  }

  // Một ô nhập có nhãn + thông báo lỗi
  const field = (label: string, name: keyof Form, input: ReactNode) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      {input}
      {errors[name] && <small className="text-xs text-red-600">{errors[name]}</small>}
    </label>
  )
  const inputClass = (name: keyof Form) => `input ${errors[name] ? 'border-red-500' : ''}`

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{isEdit ? `Sửa nhân viên #${editId}` : 'Thêm nhân viên'}</h2>
        <button className="btn border-transparent" onClick={() => goTo({ name: 'list' })}>← Về danh sách</button>
      </div>

      {serverError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{serverError}</div>}
      {success && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">{success}</div>}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {field('Họ tên *', 'name',
          <input className={inputClass('name')} value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Nguyễn Văn A" />)}
        {field('Ngày sinh *', 'birthDate',
          <input type="date" className={inputClass('birthDate')} value={form.birthDate} onChange={(e) => change('birthDate', e.target.value)} />)}
        {field('Email *', 'email',
          <input className={inputClass('email')} value={form.email} onChange={(e) => change('email', e.target.value)} placeholder="ten@cinema.vn" />)}
        {field('Số điện thoại *', 'phone',
          <input className={inputClass('phone')} value={form.phone} maxLength={10} onChange={(e) => change('phone', e.target.value)} placeholder="0901234567" />)}
        {!isEdit && field('Mật khẩu *', 'password',
          <input type="password" className={inputClass('password')} value={form.password} onChange={(e) => change('password', e.target.value)} />)}
        {field('Ngày bắt đầu làm việc *', 'startDate',
          <input type="date" className={inputClass('startDate')} value={form.startDate} onChange={(e) => change('startDate', e.target.value)} />)}
        {field('Lương (VNĐ) *', 'salary',
          <input type="number" min={1} step={100000} className={inputClass('salary')} value={form.salary} onChange={(e) => change('salary', e.target.value)} />)}
        {field('Chức vụ *', 'position',
          <select className="input" value={form.position} onChange={(e) => change('position', e.target.value)}>
            <option value="Cashier">Cashier</option>
            <option value="Manager">Manager</option>
          </select>)}
        {isEdit && field('Trạng thái *', 'status',
          <select className="input" value={form.status} onChange={(e) => change('status', e.target.value)}>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Resigned">Resigned</option>
          </select>)}
        {field('Rạp *', 'cinemaId',
          <select className={inputClass('cinemaId')} value={form.cinemaId} onChange={(e) => change('cinemaId', e.target.value)}>
            <option value="">-- Chọn rạp --</option>
            {cinemas.map((c) => <option key={c.CinemaID} value={c.CinemaID}>{c.CinemaName}</option>)}
          </select>)}
        {form.position === 'Cashier' && field('Người quản lý *', 'supervisorId',
          <select className={inputClass('supervisorId')} value={form.supervisorId} disabled={!form.cinemaId}
                  onChange={(e) => change('supervisorId', e.target.value)}>
            <option value="">{form.cinemaId ? '-- Chọn manager --' : 'Chọn rạp trước'}</option>
            {managers.map((m) => (
              <option key={m.UserID} value={m.UserID}>
                {m.Name} (lương {Number(m.Salary).toLocaleString('vi-VN')} đ)
              </option>
            ))}
          </select>)}

        <div className="flex gap-3 md:col-span-2">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </button>
          {isEdit && <button type="button" className="btn-danger" onClick={handleDelete}>Xóa nhân viên</button>}
        </div>
      </form>
    </div>
  )
}
