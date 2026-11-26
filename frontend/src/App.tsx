import { useState } from 'react'
import type { ReactNode } from 'react'
import Overview from './pages/Overview.tsx'
import DataBrowser from './pages/DataBrowser.tsx'
import StaffList from './pages/StaffList.tsx'
import StaffForm from './pages/StaffForm.tsx'
import Reports from './pages/Reports.tsx'

// Không dùng router cho đơn giản: lưu trang hiện tại trong state
export type Page =
  | { name: 'overview' }
  | { name: 'browser'; table?: string; filter?: { column: string; value: string } }
  | { name: 'list'; flash?: string }
  | { name: 'form'; editId?: number }
  | { name: 'reports' }

type NavItem = { label: string; hint: string; target: Page; active: (p: Page) => boolean }

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Database',
    items: [
      { label: 'Tổng quan', hint: 'Bảng, trigger, thủ tục, hàm', target: { name: 'overview' }, active: (p) => p.name === 'overview' },
      { label: 'Duyệt dữ liệu', hint: '1.1 · 1.2 — mọi bảng', target: { name: 'browser' }, active: (p) => p.name === 'browser' },
    ],
  },
  {
    section: 'Ứng dụng (phần 3)',
    items: [
      { label: 'Danh sách nhân viên', hint: '3.2 · gọi sp_ListStaff', target: { name: 'list' }, active: (p) => p.name === 'list' || (p.name === 'form' && p.editId !== undefined) },
      { label: 'Thêm nhân viên', hint: '3.1 · gọi sp_InsertStaff', target: { name: 'form' }, active: (p) => p.name === 'form' && p.editId === undefined },
      { label: 'Thủ tục và hàm', hint: '3.3 · P2, F1, F2', target: { name: 'reports' }, active: (p) => p.name === 'reports' },
    ],
  },
]

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'overview' })

  let content: ReactNode = null
  if (page.name === 'overview') content = <Overview goTo={setPage} />
  if (page.name === 'browser') content = <DataBrowser key={`${page.table}-${page.filter?.column}-${page.filter?.value}`} initialTable={page.table} initialFilter={page.filter} goTo={setPage} />
  if (page.name === 'list') content = <StaffList flash={page.flash} goTo={setPage} />
  // key để form reset khi chuyển giữa Thêm và Sửa
  if (page.name === 'form') content = <StaffForm key={page.editId ?? 'new'} editId={page.editId} goTo={setPage} />
  if (page.name === 'reports') content = <Reports />

  return (
    <div className="flex min-h-screen text-slate-800">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-red-600 text-sm">CD</span>
            Cinema Admin
          </div>
          <p className="mt-1 text-xs text-slate-400">CC06 · Nhóm 4 · MySQL cinema</p>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.section}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.active(page)
                  return (
                    <button key={item.label} onClick={() => setPage(item.target)}
                      className={`block w-full cursor-pointer rounded-md px-3 py-2 text-left transition ${active ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
                      <span className={`block text-sm font-medium ${active ? 'text-white' : ''}`}>{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">Thêm/sửa/xóa đều gọi thủ tục 2.1</p>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <div className="mx-auto max-w-7xl">{content}</div>
      </main>
    </div>
  )
}
