import { useState } from 'react'
import StaffList from './pages/StaffList.tsx'
import StaffForm from './pages/StaffForm.tsx'
import Reports from './pages/Reports.tsx'

// Không dùng router cho đơn giản: lưu trang hiện tại trong state
export type Page =
  | { name: 'list'; flash?: string }
  | { name: 'form'; editId?: number }
  | { name: 'reports' }

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'list' })

  const tab = (label: string, target: Page, active: boolean) => (
    <button
      onClick={() => setPage(target)}
      className={`rounded-md px-4 py-2 text-sm ${active ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen text-slate-800">
      <header className="flex h-14 items-center gap-8 bg-slate-900 px-6">
        <span className="text-lg font-bold text-white">🎬 Cinema Admin</span>
        <nav className="flex gap-1">
          {tab('Nhân viên', { name: 'list' }, page.name === 'list')}
          {tab('Thêm nhân viên', { name: 'form' }, page.name === 'form' && !page.editId)}
          {tab('Thống kê', { name: 'reports' }, page.name === 'reports')}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {/* key để form reset khi chuyển giữa Thêm và Sửa */}
        {page.name === 'list' && <StaffList flash={page.flash} goTo={setPage} />}
        {page.name === 'form' && <StaffForm key={page.editId ?? 'new'} editId={page.editId} goTo={setPage} />}
        {page.name === 'reports' && <Reports />}
      </main>
    </div>
  )
}
