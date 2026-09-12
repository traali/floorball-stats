import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout() {
  const isEmbed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('embed') === 'true'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__APP_BUILD_INFO__ = {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
        commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
        buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
      }

      const p = window.location.pathname
      if (!window.location.hash && (p.startsWith('/match/') || p.startsWith('/team/'))) {
        window.location.replace('/#' + p + window.location.search)
      }
    }
  }, [])

  return (
    <div className={`min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between ${
      isEmbed ? 'p-2' : 'pb-20'
    }`}>
      <div className="flex-1 w-full">
        {!isEmbed && <Header isEmbed={isEmbed} />}
        <main className="py-2">
          <Outlet />
        </main>
      </div>

      {!isEmbed && <BottomNav />}
    </div>
  )
}
