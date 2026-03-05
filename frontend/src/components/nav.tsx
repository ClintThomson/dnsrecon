import { Link, useLocation } from 'react-router-dom'
import { Globe, History, LayoutDashboard, LogOut, Plus, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export function Nav() {
  const { pathname } = useLocation()
  const { user, isAdmin, signOut } = useAuth()

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/scans/new', label: 'New Scan', icon: Plus },
    { to: '/history', label: 'History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ to: '/admin/users', label: 'Users', icon: Users }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link to="/" className="mr-8 flex items-center gap-2.5 font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">DNSRecon</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50',
                  active && 'bg-accent text-accent-foreground shadow-sm'
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
