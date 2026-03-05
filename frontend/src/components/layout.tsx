import { Outlet } from 'react-router-dom'
import { Nav } from './nav'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
