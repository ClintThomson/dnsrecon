import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight, Globe, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useScans, useDeleteScan } from '@/hooks/use-scans'

const PER_PAGE = 20

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const { data, isLoading } = useScans(page, PER_PAGE)
  const deleteScan = useDeleteScan()

  const scans = data?.scans ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)

  const filtered = filter
    ? scans.filter((s) => s.domain.toLowerCase().includes(filter.toLowerCase()) || s.scan_type.includes(filter.toLowerCase()))
    : scans

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
        <p className="text-muted-foreground">{total} total scans</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by domain or type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scans</CardTitle>
          <CardDescription>Click on a scan to view its results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Globe className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No scans found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <Link to={`/scans/${scan.id}`} className="flex flex-1 items-center gap-3">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{scan.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {scan.scan_type.replace(/_/g, ' ')} &middot;{' '}
                        {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={scan.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={async (e) => {
                        e.preventDefault()
                        if (confirm('Delete this scan?')) await deleteScan.mutateAsync(scan.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
