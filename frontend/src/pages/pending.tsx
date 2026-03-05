import { Globe, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

export default function PendingPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="auth-bg-grid absolute inset-0" />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">DNSRecon</span>
        </div>

        <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base">
              Your account has been created successfully, but an administrator needs to approve your access before you can use
              DNSRecon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            <p className="text-sm text-muted-foreground">You&apos;ll be able to access the dashboard once an admin approves your account.</p>
            <Button variant="outline" onClick={signOut} className="mt-2 gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
