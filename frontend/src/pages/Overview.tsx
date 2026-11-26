// Trang Tổng quan: toàn bộ bảng (số dòng), trigger, thủ tục, hàm đang có trong database
// và bảng đối chiếu với yêu cầu của đề (đủ >= 5 dòng mỗi bảng, đủ thủ tục/hàm).
import { useEffect, useState } from 'react'
import { request } from '../api.ts'
import type { SchemaInfo } from '../api.ts'
import type { Page } from '../App.tsx'

const MIN_ROWS = 5 // mục 1.2: ít nhất 5 dòng mỗi bảng

// Các đối tượng đề bài yêu cầu, theo đúng tên nhóm đã thống nhất
const EXPECTED: { section: string; name: string; type: 'PROCEDURE' | 'FUNCTION'; owner: string }[] = [
  { section: '2.1', name: 'sp_InsertStaff', type: 'PROCEDURE', owner: 'Vinh' },
  { section: '2.1', name: 'sp_UpdateStaff', type: 'PROCEDURE', owner: 'Vinh' },
  { section: '2.1', name: 'sp_DeleteStaff', type: 'PROCEDURE', owner: 'Vinh' },
  { section: '2.3', name: 'sp_ListStaff', type: 'PROCEDURE', owner: 'Vinh' },
  { section: '2.3', name: 'sp_ReviewStatsByMovie', type: 'PROCEDURE', owner: 'Tài' },
  { section: '2.4', name: 'fn_RoomOccupancyRate', type: 'FUNCTION', owner: 'Ca' },
  { section: '2.4', name: 'fn_CheckTicketCombo', type: 'FUNCTION', owner: 'Tài' },
]

const MODULE_COLOR: Record<string, string> = {
  M1: 'bg-red-500', M2: 'bg-amber-500', M3: 'bg-sky-500', M4: 'bg-emerald-500',
}

export default function Overview({ goTo }: { goTo: (p: Page) => void }) {
  const [info, setInfo] = useState<SchemaInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true); setError('')
    try { setInfo(await request<SchemaInfo>('/schema')) }
    catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (error) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Tổng quan database</h2>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
        <button className="btn mt-4" onClick={load}>Thử lại</button>
      </div>
    )
  }
  if (loading || !info) return <div className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Đang đọc database...</div>

  const tables = info.groups.flatMap((g) => g.tables)
  const created = tables.filter((t) => t.rows !== null)
  const totalRows = created.reduce((s, t) => s + (t.rows ?? 0), 0)
  const enoughData = created.filter((t) => (t.rows ?? 0) >= MIN_ROWS).length
  const procedures = info.routines.filter((r) => r.type === 'PROCEDURE')
  const functions = info.routines.filter((r) => r.type === 'FUNCTION')
  const existing = new Set(info.routines.map((r) => r.name.toLowerCase()))

  const stat = (label: string, value: string | number, note?: string) => (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tổng quan database</h2>
          <p className="text-sm text-slate-500">Đọc trực tiếp từ MySQL (information_schema) mỗi lần mở trang</p>
        </div>
        <button className="btn" onClick={load}>Tải lại</button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stat('Bảng', `${created.length}/${tables.length}`, created.length < tables.length ? `${tables.length - created.length} bảng chưa tạo` : 'Đã tạo đủ')}
        {stat('Tổng số dòng', totalRows.toLocaleString('vi-VN'))}
        {stat('Bảng đủ dữ liệu', `${enoughData}/${tables.length}`, `Mỗi bảng cần ≥ ${MIN_ROWS} dòng (1.2)`)}
        {stat('Trigger', info.triggers.length)}
        {stat('Thủ tục / Hàm', `${procedures.length} / ${functions.length}`)}
      </div>

      {/* Các module và bảng */}
      <div className="grid gap-4 lg:grid-cols-2">
        {info.groups.map((g) => (
          <section key={g.key} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${MODULE_COLOR[g.key] ?? 'bg-slate-400'}`} />
              <h3 className="font-bold">{g.key} · {g.title}</h3>
              <span className="ml-auto text-xs text-slate-500">Phụ trách: {g.owner}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {g.tables.map((t) => {
                const missing = t.rows === null
                const few = !missing && (t.rows ?? 0) < MIN_ROWS
                return (
                  <button key={t.name} onClick={() => goTo({ name: 'browser', table: t.name })}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-red-300 hover:bg-red-50/40">
                    <span className="font-medium">{t.name}</span>
                    {missing && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">chưa tạo</span>}
                    {few && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t.rows} dòng</span>}
                    {!missing && !few && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">{t.rows} dòng</span>}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Đối chiếu yêu cầu đề bài */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold">Thủ tục và hàm theo đề bài</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2">Mục</th><th>Tên</th><th>Loại</th><th>Phụ trách</th><th className="text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTED.map((e) => {
                const ok = existing.has(e.name.toLowerCase())
                return (
                  <tr key={e.name} className="border-t border-slate-100">
                    <td className="py-2 text-slate-500">{e.section}</td>
                    <td className="font-mono text-xs">{e.name}</td>
                    <td className="text-xs text-slate-500">{e.type === 'PROCEDURE' ? 'Thủ tục' : 'Hàm'}</td>
                    <td>{e.owner}</td>
                    <td className="text-right">
                      {ok
                        ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Đã có</span>
                        : <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Chưa có</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {info.routines.filter((r) => !EXPECTED.some((e) => e.name.toLowerCase() === r.name.toLowerCase())).length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Khác: {info.routines.filter((r) => !EXPECTED.some((e) => e.name.toLowerCase() === r.name.toLowerCase())).map((r) => r.name).join(', ')}
            </p>
          )}
        </section>

        {/* Trigger */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold">Trigger đang có ({info.triggers.length})</h3>
          {info.triggers.length === 0 && <p className="text-sm text-slate-500">Chưa có trigger. Hãy chạy 02_triggers.sql</p>}
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {info.triggers.map((t) => (
                  <tr key={t.name} className="border-t border-slate-100 first:border-t-0">
                    <td className="py-2 font-mono text-xs">{t.name}</td>
                    <td className="text-xs text-slate-500">{t.timing} {t.event}</td>
                    <td className="text-right">
                      <button className="cursor-pointer text-xs font-medium text-red-700 hover:underline"
                        onClick={() => goTo({ name: 'browser', table: t.tableName })}>{t.tableName}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
