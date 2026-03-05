import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="auth-bg-grid absolute inset-0" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">DNSRecon</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              DNS Reconnaissance &amp; Security Toolkit
            </p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>Start scanning domains with DNSRecon</CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'oklch(0.72 0.19 230)',
                      brandAccent: 'oklch(0.65 0.20 230)',
                      inputBackground: 'oklch(0.18 0.015 260)',
                      inputText: 'oklch(0.97 0.005 260)',
                      inputBorder: 'oklch(0.26 0.02 260)',
                      inputBorderFocus: 'oklch(0.72 0.19 230)',
                      inputBorderHover: 'oklch(0.35 0.03 260)',
                    },
                    borderWidths: { buttonBorderWidth: '0px', inputBorderWidth: '1px' },
                    radii: { borderRadiusButton: '0.5rem', inputBorderRadius: '0.5rem' },
                  },
                },
              }}
              providers={[]}
              view="sign_up"
              showLinks={false}
              redirectTo={`${window.location.origin}/`}
            />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Powered by DNSRecon &middot; Open-source DNS reconnaissance
        </p>
      </div>
    </div>
  )
}
