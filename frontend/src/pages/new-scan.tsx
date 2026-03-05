import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  Search,
  ArrowLeftRight,
  Server,
  Layers,
  Route,
  Shield,
  FileKey,
  Database,
  Eye,
  Info,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScanTypeCard } from '@/components/scan-type-card'
import { useCreateScan } from '@/hooks/use-scans'

const SCAN_TYPES = [
  { value: 'general_enum', title: 'General Enumeration', description: 'SOA, NS, MX, A, AAAA, SPF, TXT records plus optional sources', icon: Globe },
  { value: 'brute_domain', title: 'Subdomain Brute Force', description: 'Discover subdomains using a wordlist', icon: Search },
  { value: 'brute_reverse', title: 'Reverse DNS', description: 'PTR lookups for an IP range', icon: ArrowLeftRight },
  { value: 'brute_srv', title: 'SRV Records', description: 'Discover services via SRV record brute force', icon: Server },
  { value: 'brute_tlds', title: 'TLD Expansion', description: 'Test domain across all registered TLDs', icon: Layers },
  { value: 'zone_walk', title: 'DNSSEC Zone Walk', description: 'Enumerate records via NSEC chain walking', icon: Route },
  { value: 'wildcard_check', title: 'Wildcard Check', description: 'Detect wildcard DNS configuration', icon: Shield },
  { value: 'axfr_test', title: 'Zone Transfer', description: 'Test if AXFR zone transfer is permitted', icon: FileKey },
  { value: 'caa_records', title: 'CAA Records', description: 'Certificate Authority Authorization lookup', icon: Shield },
  { value: 'cache_snoop', title: 'Cache Snooping', description: 'Test nameserver cache for specific domains', icon: Database },
  { value: 'bind_version', title: 'BIND Version', description: 'Detect BIND version on nameserver', icon: Info },
  { value: 'recursive_check', title: 'Recursion Check', description: 'Test if nameserver allows recursive queries', icon: RefreshCw },
  { value: 'nxdomain_hijack', title: 'NXDOMAIN Hijack', description: 'Detect NXDOMAIN response hijacking', icon: AlertTriangle },
] as const

const NS_SCAN_TYPES = new Set(['cache_snoop', 'bind_version', 'recursive_check', 'nxdomain_hijack'])
const IP_SCAN_TYPES = new Set(['brute_reverse'])

export default function NewScanPage() {
  const [domain, setDomain] = useState('')
  const [scanType, setScanType] = useState<string>('general_enum')
  const [options, setOptions] = useState<Record<string, unknown>>({})
  const navigate = useNavigate()
  const createScan = useCreateScan()

  const needsNameserver = NS_SCAN_TYPES.has(scanType)
  const needsIpRange = IP_SCAN_TYPES.has(scanType)

  const handleSubmit = async () => {
    if (!domain) return
    const finalOptions = { ...options }
    if (needsNameserver) finalOptions.nameserver = domain
    if (needsIpRange) finalOptions.ip_range = domain
    try {
      const scan = await createScan.mutateAsync({ domain, scan_type: scanType, options: finalOptions })
      navigate(`/scans/${scan.id}`)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Scan</h1>
        <p className="text-muted-foreground">Configure and launch a DNS reconnaissance scan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target</CardTitle>
          <CardDescription>
            {needsNameserver ? 'Enter the nameserver IP or hostname' : needsIpRange ? 'Enter an IP range (e.g. 192.168.1.1-192.168.1.254)' : 'Enter the domain you want to scan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={needsNameserver ? 'ns1.example.com' : needsIpRange ? '192.168.1.1-192.168.1.254' : 'example.com'}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Scan Type</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SCAN_TYPES.map((st) => (
            <ScanTypeCard
              key={st.value}
              title={st.title}
              description={st.description}
              icon={st.icon}
              selected={scanType === st.value}
              onClick={() => {
                setScanType(st.value)
                setOptions({})
              }}
            />
          ))}
        </div>
      </div>

      {scanType === 'general_enum' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'do_axfr', label: 'Zone Transfer (AXFR)' },
                { key: 'do_crt', label: 'Certificate Transparency' },
                { key: 'do_bing', label: 'Bing Search' },
                { key: 'do_yandex', label: 'Yandex Search' },
                { key: 'do_spf', label: 'SPF Records' },
                { key: 'do_whois', label: 'WHOIS Lookup' },
                { key: 'zone_walk', label: 'Zone Walking' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!options[key]}
                    onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                    className="rounded border-input"
                  />
                  {label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <Button size="lg" onClick={handleSubmit} disabled={!domain || createScan.isPending}>
          {createScan.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Starting...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" /> Launch Scan
            </>
          )}
        </Button>
        {createScan.isError && <p className="text-sm text-destructive">{createScan.error.message}</p>}
      </div>
    </div>
  )
}
