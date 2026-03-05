import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'approved' | 'guest'

interface UserProfile {
  id: string
  email: string
  role: Role
  display_name: string | null
}

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  role: Role | null
  isAdmin: boolean
  isApproved: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  role: null,
  isAdmin: false,
  isApproved: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

async function fetchProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.access_token) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(s.access_token)
    setProfile(p)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      await loadProfile(s)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    await loadProfile(session)
  }

  const role = profile?.role ?? null
  const isAdmin = role === 'admin'
  const isApproved = role === 'admin' || role === 'approved'

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, profile, loading, role, isAdmin, isApproved, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
