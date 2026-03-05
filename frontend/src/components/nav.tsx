import { Link, useLocation } from 'react-router-dom'
import { Globe, History, LayoutDashboard, LogOut, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scans/new', label: 'New Scan', icon: Plus },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link to="/" className="mr-8 flex items-center gap-2 font-bold">
          <Globe className="h-5 w-5 text-primary" />
          <span>DNSRecon</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                (to === '/' ? pathname === '/' : pathname.startsWith(to)) && 'bg-accent text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
