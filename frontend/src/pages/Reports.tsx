// Mục 3.3: Gọi thủ tục P2 (sp_ReviewStatsByMovie) và hàm F2 (fn_CheckTicketCombo)
// TODO(Tài): chỉnh cột hiển thị cho khớp kết quả thủ tục sau khi viết xong SQL
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { request, toQuery } from '../api.ts'
import type { Genre } from '../api.ts'

type Row = Record<string, string | number | null>

export default function Reports() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [p2, setP2] = useState({ genreId: '', fromDate: '', minReviews: '1' })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [p2Error, setP2Error] = useState('')

  const [bookingId, setBookingId] = useState('')
  const [f2Result, setF2Result] = useState('')
  const [f2Error, setF2Error] = useState('')

  useEffect(() => {
    request<Genre[]>('/genres').then(setGenres).catch(() => {})
  }, [])

  async function runP2(e: FormEvent) {
    e.preventDefault()
    setP2Error('')
    const n = Number(p2.minReviews)
    if (p2.minReviews !== '' && (!Number.isInteger(n) || n < 0)) {
      setP2Error('Số review tối thiểu phải là số nguyên không âm'); return
    }
    try {
      setRows(await request<Row[]>('/reports/review-stats' + toQuery(p2)))
    } catch (err) {
      setP2Error((err as Error).message); setRows(null)
    }
  }

  async function runF2(e: FormEvent) {
    e.preventDefault()
    setF2Error(''); setF2Result('')
    const id = Number(bookingId)
    if (!Number.isInteger(id) || id <= 0) { setF2Error('Mã booking phải là số nguyên dương'); return }
    try {
      const r = await request<{ result: string }>(`/reports/check-combo/${id}`)
      setF2Result(r.result)
    } catch (err) {
      setF2Error((err as Error).message)
    }
  }

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : []
  const errorBox = (msg: string) => <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{msg}</div>

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold">Thống kê điểm review theo phim</h2>
        <form onSubmit={runP2} className="flex flex-wrap items-center gap-3">
          <select className="input w-auto" value={p2.genreId} onChange={(e) => setP2({ ...p2, genreId: e.target.value })}>
            <option value="">Mọi thể loại</option>
            {genres.map((g) => <option key={g.GenreID} value={g.GenreID}>{g.GenreName}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Từ ngày
            <input type="date" className="input w-auto" value={p2.fromDate} onChange={(e) => setP2({ ...p2, fromDate: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Số review tối thiểu
            <input type="number" min={0} className="input w-24" value={p2.minReviews} onChange={(e) => setP2({ ...p2, minReviews: e.target.value })} />
          </label>
          <button className="btn-primary">Xem thống kê</button>
        </form>
        {p2Error && errorBox(p2Error)}
        {rows && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr>{columns.map((c) => <th key={c} className="bg-slate-50 px-3 py-2 text-left text-xs uppercase text-slate-500">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td className="py-6 text-center text-slate-500">Không có dữ liệu</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}>{columns.map((c) => <td key={c} className="border-t border-slate-100 px-3 py-2">{String(r[c] ?? '')}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold">Kiểm tra ticket combo của booking</h2>
        <form onSubmit={runF2} className="flex gap-3">
          <input type="number" min={1} className="input w-48" placeholder="Mã booking"
                 value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
          <button className="btn-primary">Kiểm tra</button>
        </form>
        {f2Error && errorBox(f2Error)}
        {f2Result && (
          <div className={`mt-4 rounded-md border px-4 py-3 ${f2Result === 'OK' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            Kết quả: {f2Result}
          </div>
        )}
      </div>
    </div>
  )
}
