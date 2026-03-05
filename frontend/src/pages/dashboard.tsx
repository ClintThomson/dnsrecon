import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Globe, Plus, Search, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useScans, useStats } from '@/hooks/use-scans'
import { useAuth } from '@/hooks/use-auth'

function StatCard({ title, value, icon: Icon, loading }: { title: string; value: number | string; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
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
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Scan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Scans" value={stats.data?.total_scans ?? 0} icon={Search} loading={stats.isLoading} />
        <StatCard title="Completed" value={stats.data?.completed_scans ?? 0} icon={Activity} loading={stats.isLoading} />
        <StatCard title="Records Found" value={stats.data?.total_records_found ?? 0} icon={Server} loading={stats.isLoading} />
        <StatCard title="Domains Scanned" value={stats.data?.domains_scanned ?? 0} icon={Globe} loading={stats.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Your latest DNS reconnaissance activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentScans.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !recentScans.data?.scans.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No scans yet. Start your first DNS reconnaissance!</p>
              <Link to="/scans/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Create Scan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.data.scans.map((scan) => (
                <Link
                  key={scan.id}
                  to={`/scans/${scan.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
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
