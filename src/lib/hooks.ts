import { useEffect } from 'react'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Organization } from '@/types/database'

// --- Zustand Store ---

type AppStore = {
  profile: Profile | null
  org: Organization | null
  loading: boolean
  error: string | null
  _fetched: boolean
  setProfile: (profile: Profile | null) => void
  setOrg: (org: Organization | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFetched: (fetched: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  profile: null,
  org: null,
  loading: true,
  error: null,
  _fetched: false,
  setProfile: (profile) => set({ profile }),
  setOrg: (org) => set({ org }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFetched: (fetched) => set({ _fetched: fetched }),
  reset: () =>
    set({
      profile: null,
      org: null,
      loading: false,
      error: null,
      _fetched: false,
    }),
}))

// --- Hooks ---

/**
 * Fetches and caches user profile + organization from Supabase.
 * Data is stored in a zustand store and shared across components.
 */
export function useProfile(): {
  profile: Profile | null
  org: Organization | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { profile, org, loading, error, _fetched } = useAppStore()
  const { setProfile, setOrg, setLoading, setError, setFetched } =
    useAppStore()

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw new Error(authError.message)
      }

      if (!user) {
        setProfile(null)
        setOrg(null)
        setFetched(true)
        return
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>()

      if (profileError) {
        throw new Error(profileError.message)
      }

      setProfile(profileData)

      // Fetch organization
      if (profileData?.org_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.org_id)
          .single<Organization>()

        if (orgError) {
          throw new Error(orgError.message)
        }

        setOrg(orgData)
      }

      setFetched(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'プロフィールの取得に失敗しました'
      setError(message)
      console.error('useProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!_fetched) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_fetched])

  return {
    profile,
    org,
    loading,
    error,
    refetch: fetchProfile,
  }
}

/**
 * Returns the current organization ID.
 * Uses useProfile internally and waits for data to load.
 */
export function useOrgId(): {
  orgId: string | null
  loading: boolean
  error: string | null
} {
  const { profile, loading, error } = useProfile()

  return {
    orgId: profile?.org_id ?? null,
    loading,
    error,
  }
}

// --- Utility Functions ---

export function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP')
}

export function formatCostRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}

export function getCostRateColor(rate: number): string {
  if (rate < 25) return 'badge-success'
  if (rate < 35) return 'badge-info'
  if (rate < 45) return 'badge-warning'
  return 'badge-danger'
}
