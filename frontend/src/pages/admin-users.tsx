import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Check, Crown, Shield, Trash2, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type UserProfile } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

function RoleBadge({ role }: { role: string }) {
  const config = {
    admin: { label: 'Admin', icon: Crown, className: 'bg-amber-500/10 text-amber-500 ring-amber-500/20' },
    approved: { label: 'Approved', icon: Shield, className: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' },
    guest: { label: 'Pending', icon: UserX, className: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20' },
  }[role] ?? { label: role, icon: Users, className: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20' }

  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: api.listUsers,
  })

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setConfirmDelete(null)
    },
  })

  const handleRoleChange = (userId: string, currentRole: string) => {
    if (currentRole === 'guest') {
      updateRole.mutate({ userId, role: 'approved' })
    } else if (currentRole === 'approved') {
      updateRole.mutate({ userId, role: 'admin' })
    }
  }

  const handleDemote = (userId: string, currentRole: string) => {
    if (currentRole === 'admin') {
      updateRole.mutate({ userId, role: 'approved' })
    } else if (currentRole === 'approved') {
      updateRole.mutate({ userId, role: 'guest' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts and their access levels</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {users?.filter((u) => u.role === 'approved' || u.role === 'admin').length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{users?.filter((u) => u.role === 'guest').length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>Click approve to grant access, or promote to admin</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !users?.length ? (
            <p className="py-8 text-center text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u: UserProfile) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between',
                      isSelf && 'ring-1 ring-primary/20'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{u.email}</p>
                        {isSelf && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {u.display_name && `${u.display_name} · `}
                        Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <RoleBadge role={u.role} />

                      {!isSelf && (
                        <>
                          {u.role === 'guest' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => handleRoleChange(u.id, u.role)}
                              disabled={updateRole.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          )}

                          {u.role === 'approved' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                onClick={() => handleRoleChange(u.id, u.role)}
                                disabled={updateRole.isPending}
                              >
                                <Crown className="h-3.5 w-3.5" />
                                Promote
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => handleDemote(u.id, u.role)}
                                disabled={updateRole.isPending}
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Revoke
                              </Button>
                            </>
                          )}

                          {u.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => handleDemote(u.id, u.role)}
                              disabled={updateRole.isPending}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Demote
                            </Button>
                          )}

                          {confirmDelete === u.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteUser.mutate(u.id)}
                                disabled={deleteUser.isPending}
                              >
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDelete(u.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
