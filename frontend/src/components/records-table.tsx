import { useState, useMemo } from 'react'
import type { ScanResult } from '@/lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Download } from 'lucide-react'

type SortKey = 'record_type' | 'name' | 'address'

export function RecordsTable({ results }: { results: ScanResult[] }) {
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return results
      .filter((r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q) || r.record_type.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [results, filter, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const exportCsv = () => {
    const header = 'Type,Name,Address,Target,Port\n'
    const rows = filtered.map((r) => `${r.record_type},${r.name},${r.address},${r.target ?? ''},${r.port ?? ''}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scan-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scan-results.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(field)}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input placeholder="Filter records..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="mr-1 h-4 w-4" /> JSON
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton label="Type" field="record_type" /></TableHead>
              <TableHead><SortButton label="Name" field="name" /></TableHead>
              <TableHead><SortButton label="Address" field="address" /></TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Port</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.record_type}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{r.name}</TableCell>
                  <TableCell className="font-mono text-sm">{r.address}</TableCell>
                  <TableCell className="font-mono text-sm">{r.target ?? '-'}</TableCell>
                  <TableCell>{r.port ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {results.length} records</p>
    </div>
  )
}
