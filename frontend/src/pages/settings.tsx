import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Copy, Key, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/hooks/use-scans'
import { useAuth } from '@/hooks/use-auth'

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: apiKeys, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const deleteKey = useDeleteApiKey()

  const [keyName, setKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateKey = async () => {
    if (!keyName.trim()) return
    const result = await createKey.mutateAsync(keyName.trim())
    setCreatedKey(result.key)
    setKeyName('')
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and API keys</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">User ID</label>
            <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Generate API keys for programmatic access to the DNSRecon API. Keys are shown only once upon creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="mb-1 block text-sm font-medium">Key Name</label>
              <Input
                placeholder="e.g. CI Pipeline"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
              />
            </div>
            <Button onClick={handleCreateKey} disabled={!keyName.trim() || createKey.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Create Key
            </Button>
          </div>

          {createdKey && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-2 text-sm font-medium text-emerald-800">
                API key created! Copy it now -- it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">{createdKey}</code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  <Copy className="mr-1 h-4 w-4" /> {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !apiKeys?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No API keys yet</p>
            ) : (
              apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                        {k.last_used_at &&
                          ` · Last used ${formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete API key "${k.name}"?`)) deleteKey.mutate(k.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
