import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowLeft, Clock, Globe, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/status-badge'
import { RecordsTable } from '@/components/records-table'
import { useScan, useDeleteScan, useCancelScan } from '@/hooks/use-scans'

export default function ScanResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useScan(id!)
  const deleteScan = useDeleteScan()
  const cancelScan = useCancelScan()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{error?.message ?? 'Scan not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </div>
    )
  }

  const { scan, results } = data
  const isActive = scan.status === 'pending' || scan.status === 'running'
  const isCancelled = scan.status === 'cancelled'
  const recordTypes = [...new Set(results.map((r) => r.record_type))].sort()

  const handleDelete = async () => {
    if (!confirm('Delete this scan and all its results?')) return
    await deleteScan.mutateAsync(scan.id)
    navigate('/history')
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this running scan? Partial results will be saved.')) return
    await cancelScan.mutateAsync(scan.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{scan.domain}</h1>
            <StatusBadge status={scan.status} />
            {isActive && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {scan.scan_type.replace(/_/g, ' ')} &middot; started{' '}
            {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelScan.isPending}
              className="border-yellow-600 text-yellow-500 hover:bg-yellow-600/10"
            >
              <XCircle className="mr-1 h-4 w-4" /> Cancel
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteScan.isPending}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {isActive && (
        <Card className="border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm font-medium">Scanning in progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {scan.progress != null ? `${scan.progress} records found` : 'Starting...'}
              </span>
            </div>
            <Progress value={100} className="h-1.5 animate-pulse" />
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <Card className="border-yellow-600/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Scan was cancelled
                {scan.progress != null && scan.progress > 0 && ` — ${scan.progress} partial records saved`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Records Found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isActive ? (scan.progress ?? 0) : results.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Record Types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {recordTypes.length > 0 ? (
                recordTypes.map((t) => <Badge key={t} variant="outline">{t}</Badge>)
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {scan.started_at && scan.completed_at
                  ? `${((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000).toFixed(1)}s`
                  : scan.started_at
                    ? 'In progress...'
                    : 'Not started'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {scan.error_message && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{scan.error_message}</pre>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {results.length} records found
              {isActive && ' so far'}
              {scan.completed_at && !isActive && (
                <> &middot; {format(new Date(scan.completed_at), 'PPpp')}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({results.length})</TabsTrigger>
                {recordTypes.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t} ({results.filter((r) => r.record_type === t).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all">
                <RecordsTable results={results} />
              </TabsContent>
              {recordTypes.map((t) => (
                <TabsContent key={t} value={t}>
                  <RecordsTable results={results.filter((r) => r.record_type === t)} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {isActive && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
            <p className="text-lg font-medium">Scan in progress</p>
            <p className="text-sm text-muted-foreground">Results will appear here as they are discovered</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
