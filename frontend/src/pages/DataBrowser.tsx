// Duyệt dữ liệu: xem mọi bảng của database (chỉ đọc).
//  - Tab "Dữ liệu": tìm kiếm, sắp xếp, phân trang; bấm giá trị khóa ngoại để mở bảng được tham chiếu
//  - Tab "Cấu trúc": cột, kiểu, PK/FK/UNIQUE, CHECK, trigger gắn trên bảng
// Thêm/sửa/xóa KHÔNG làm ở đây: đề yêu cầu phải đi qua thủ tục 2.1 (trang Nhân viên).
import { useEffect, useMemo, useState } from 'react'
import { request } from '../api.ts'
import type { ColumnInfo, SchemaInfo, TableData } from '../api.ts'
import type { Page } from '../App.tsx'

const PAGE_SIZE = 20
const NUMERIC = /^(tinyint|smallint|mediumint|int|bigint|decimal|float|double)/i

type Filter = { column: string; value: string }
type Props = { initialTable?: string; initialFilter?: Filter; goTo: (p: Page) => void }

function display(v: unknown) {
  if (v === null || v === undefined) return null
  return String(v)
}

export default function DataBrowser({ initialTable, initialFilter, goTo }: Props) {
  const [schema, setSchema] = useState<SchemaInfo | null>(null)
  const [table, setTable] = useState(initialTable ?? 'Cinema')
  const [data, setData] = useState<TableData | null>(null)
  const [tab, setTab] = useState<'data' | 'structure'>('data')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter | null>(initialFilter ?? null)
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    request<SchemaInfo>('/schema').then(setSchema).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    setLoading(true); setError(''); setData(null); setPage(0); setSort(null)
    request<TableData>(`/tables/${table}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [table])

  function openTable(name: string, f: Filter | null = null) {
    setTable(name); setFilter(f); setSearch(''); setTab('data')
  }

  // Lọc + sắp xếp phía giao diện (dữ liệu đã tải tối đa 1000 dòng)
  const rows = useMemo(() => {
    if (!data) return []
    let list = data.rows
    if (filter) list = list.filter((r) => display(r[filter.column]) === filter.value)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((r) => Object.values(r).some((v) => display(v)?.toLowerCase().includes(q)))
    if (sort) {
      const numeric = NUMERIC.test(data.columns.find((c) => c.name === sort.col)?.type ?? '')
      list = [...list].sort((a, b) => {
        const x = a[sort.col], y = b[sort.col]
        if (x === null || x === undefined) return 1
        if (y === null || y === undefined) return -1
        const cmp = numeric ? Number(x) - Number(y) : String(x).localeCompare(String(y), 'vi')
        return cmp * sort.dir
      })
    }
    return list
  }, [data, filter, search, sort])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(col: string) {
    setPage(0)
    setSort((s) => (s?.col === col ? (s.dir === 1 ? { col, dir: -1 } : null) : { col, dir: 1 }))
  }

  const group = schema?.groups.find((g) => g.tables.some((t) => t.name === table))

  return (
    <div className="flex gap-6">
      {/* Danh sách bảng */}
      <aside className="w-56 shrink-0">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl bg-white p-3 shadow-sm">
          {!schema && <p className="p-2 text-sm text-slate-500">Đang tải...</p>}
          {schema?.groups.map((g) => (
            <div key={g.key} className="mb-3 last:mb-0">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.key} · {g.title}</p>
              {g.tables.map((t) => (
                <button key={t.name} onClick={() => openTable(t.name)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${t.name === table ? 'bg-red-50 font-semibold text-red-700' : 'hover:bg-slate-50'}`}>
                  <span>{t.name}</span>
                  <span className={`text-xs tabular-nums ${t.rows === null ? 'text-slate-400' : (t.rows ?? 0) < 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {t.rows === null ? '—' : t.rows}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Nội dung bảng */}
      <section className="min-w-0 flex-1 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group ? `${group.key} · ${group.title} · ${group.owner}` : 'Bảng'}
            </p>
            <h2 className="text-xl font-bold">{table}</h2>
          </div>
          <div className="flex rounded-md border border-slate-200 p-0.5 text-sm">
            {(['data', 'structure'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`cursor-pointer rounded px-3 py-1.5 ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {t === 'data' ? `Dữ liệu${data ? ` (${data.rows.length})` : ''}` : 'Cấu trúc'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
        {loading && <p className="py-8 text-center text-slate-500">Đang tải bảng {table}...</p>}

        {data && tab === 'data' && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input className="input max-w-sm" placeholder={`Tìm trong ${table}...`} value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
              {filter && (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">
                  {filter.column} = {filter.value}
                  <button className="cursor-pointer font-bold" onClick={() => setFilter(null)} aria-label="Bỏ lọc">×</button>
                </span>
              )}
              {table === 'Staff' && (
                <button className="btn-primary ml-auto" onClick={() => goTo({ name: 'list' })}>Quản lý nhân viên →</button>
              )}
            </div>

            {data.rows.length < 5 && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                Bảng mới có {data.rows.length} dòng. Đề yêu cầu ít nhất 5 dòng mỗi bảng (mục 1.2).
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c.name} onClick={() => toggleSort(c.name)}
                        className={`cursor-pointer whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 ${NUMERIC.test(c.type) ? 'text-right' : 'text-left'}`}>
                        {c.primaryKey && <span className="mr-1 text-amber-600" title="Khóa chính">PK</span>}
                        {c.references.length > 0 && <span className="mr-1 text-sky-600" title="Khóa ngoại">FK</span>}
                        {c.name}
                        {c.derived && <span className="ml-1 text-emerald-600" title="Thuộc tính dẫn xuất, do trigger tính">ƒ</span>}
                        {sort?.col === c.name && (sort.dir === 1 ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr><td colSpan={data.columns.length} className="py-8 text-center text-slate-500">
                      {data.rows.length === 0 ? 'Bảng chưa có dữ liệu' : 'Không có dòng phù hợp'}
                    </td></tr>
                  )}
                  {pageRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {data.columns.map((c) => <Cell key={c.name} col={c} value={r[c.name]} onOpen={openTable} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                {rows.length === data.rows.length ? `${rows.length} dòng` : `${rows.length} / ${data.rows.length} dòng`}
                {data.hiddenColumns.length > 0 && ` · ẩn cột ${data.hiddenColumns.join(', ')}`}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <button className="btn px-2 py-1" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
                  <span>Trang {page + 1}/{pageCount}</span>
                  <button className="btn px-2 py-1" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>›</button>
                </div>
              )}
            </div>
          </>
        )}

        {data && tab === 'structure' && <Structure data={data} onOpen={openTable} />}
      </section>
    </div>
  )
}

// Một ô dữ liệu. Ô khóa ngoại có thể bấm để mở bảng được tham chiếu, lọc đúng giá trị đó.
function Cell({ col, value, onOpen }: { col: ColumnInfo; value: unknown; onOpen: (t: string, f: Filter) => void }) {
  const text = display(value)
  const align = NUMERIC.test(col.type) ? 'text-right tabular-nums' : ''
  const base = `border-t border-slate-100 px-3 py-2 ${align}`
  if (text === null) return <td className={`${base} text-xs italic text-slate-400`}>NULL</td>
  // Chỉ nhảy được khi FK một cột (FK ghép nhiều cột như Ticket → Seat thì chỉ hiển thị)
  const ref = col.references[0]
  if (ref && !col.primaryKey) {
    return (
      <td className={base}>
        <button className="cursor-pointer text-sky-700 hover:underline" title={`Mở ${ref.table} có ${ref.column} = ${text}`}
          onClick={() => onOpen(ref.table, { column: ref.column, value: text })}>{text}</button>
      </td>
    )
  }
  // Tiền (decimal không có phần lẻ) -> có dấu phân cách hàng nghìn
  const shown = /^decimal\(\d+,0\)/i.test(col.type) ? Number(text).toLocaleString('vi-VN') : text
  return (
    <td className={`${base} ${col.derived ? 'font-semibold text-emerald-700' : ''}`}>
      <span className="block max-w-xs truncate" title={text}>{shown}</span>
    </td>
  )
}

function Structure({ data, onOpen }: { data: TableData; onOpen: (t: string) => void }) {
  const th = 'border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600'
  const td = 'border-t border-slate-100 px-3 py-2'
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Cột</th><th className={th}>Kiểu</th><th className={th}>NULL</th>
              <th className={th}>Khóa</th><th className={th}>Mặc định</th><th className={th}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {data.columns.map((c) => (
              <tr key={c.name}>
                <td className={`${td} font-mono text-xs font-semibold`}>{c.name}</td>
                <td className={`${td} font-mono text-xs text-slate-600`}>{c.type}</td>
                <td className={td}>{c.nullable === 'YES' ? 'Có' : <span className="font-semibold">NOT NULL</span>}</td>
                <td className={`${td} space-x-1 whitespace-nowrap`}>
                  {c.primaryKey && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">PK</span>}
                  {c.unique && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800">UNIQUE</span>}
                  {c.references.map((r) => (
                    <button key={r.table + r.column} onClick={() => onOpen(r.table)}
                      className="cursor-pointer rounded bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-800 hover:bg-sky-200">
                      FK → {r.table}.{r.column}
                    </button>
                  ))}
                </td>
                <td className={`${td} font-mono text-xs text-slate-500`}>{c.defaultValue ?? ''}</td>
                <td className={`${td} text-xs text-slate-500`}>
                  {c.extra.includes('auto_increment') && 'Tự tăng. '}
                  {c.derived && <span className="font-semibold text-emerald-700">Dẫn xuất, do trigger 2.2.2 tính</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-bold">Ràng buộc CHECK ({data.checks.length})</h3>
          {data.checks.length === 0 && <p className="text-sm text-slate-500">Không có</p>}
          <ul className="space-y-2">
            {data.checks.map((c) => (
              <li key={c.name} className="rounded-md border border-slate-200 px-3 py-2">
                <p className="font-mono text-xs font-semibold">{c.name}</p>
                <p className="mt-0.5 break-all font-mono text-xs text-slate-600">{c.clause}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-bold">Trigger trên bảng ({data.triggers.length})</h3>
          {data.triggers.length === 0 && <p className="text-sm text-slate-500">Không có</p>}
          <ul className="space-y-2">
            {data.triggers.map((t) => (
              <li key={t.name} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="font-mono text-xs font-semibold">{t.name}</span>
                <span className="text-xs text-slate-500">{t.timing} {t.event}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
