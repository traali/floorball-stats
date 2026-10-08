import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { VersionBadge } from './VersionBadge'

export function Layout() {
  const isEmbed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('embed') === 'true'

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between ${
      isEmbed ? 'p-2' : 'pb-20'
    }`}>
      <div className="flex-1 w-full">
        {!isEmbed && <Header isEmbed={isEmbed} />}
        <main className="py-2">
          <Outlet />
        </main>
        {isEmbed && (
          <div className="px-2 pb-1 text-right">
            <VersionBadge />
          </div>
        )}
      </div>

      {!isEmbed && <BottomNav />}
    </div>
  )
}
