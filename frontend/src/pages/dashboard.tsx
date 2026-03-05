import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Globe, Plus, Search, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useScans, useStats } from '@/hooks/use-scans'
import { useAuth } from '@/hooks/use-auth'

const STAT_ICONS = [
  { key: 'total_scans', title: 'Total Scans', icon: Search, gradient: 'from-blue-500/20 to-cyan-500/20' },
  { key: 'completed_scans', title: 'Completed', icon: Activity, gradient: 'from-emerald-500/20 to-green-500/20' },
  { key: 'total_records_found', title: 'Records Found', icon: Server, gradient: 'from-purple-500/20 to-pink-500/20' },
  { key: 'domains_scanned', title: 'Domains Scanned', icon: Globe, gradient: 'from-amber-500/20 to-orange-500/20' },
] as const

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  gradient,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  loading?: boolean
  gradient: string
}) {
  return (
    <Card className="relative overflow-hidden border-border/50">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardDescription className="font-medium">{title}</CardDescription>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/50">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-3xl font-bold tracking-tight">{value}</div>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const stats = useStats()
  const recentScans = useScans(1, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}</p>
        </div>
        <Link to="/scans/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> New Scan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_ICONS.map(({ key, title, icon, gradient }) => (
          <StatCard
            key={key}
            title={title}
            value={stats.data?.[key] ?? 0}
            icon={icon}
            loading={stats.isLoading}
            gradient={gradient}
          />
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your latest DNS reconnaissance activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentScans.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !recentScans.data?.scans.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <Search className="h-8 w-8 opacity-50" />
              </div>
              <p className="mb-1 font-medium">No scans yet</p>
              <p className="text-sm">Start your first DNS reconnaissance!</p>
              <Link to="/scans/new">
                <Button className="mt-4 gap-2" variant="outline">
                  <Plus className="h-4 w-4" /> Create Scan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.data.scans.map((scan) => (
                <Link
                  key={scan.id}
                  to={`/scans/${scan.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3.5 transition-all hover:bg-accent/50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{scan.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {scan.scan_type.replace('_', ' ')} &middot;{' '}
                        {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={scan.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
