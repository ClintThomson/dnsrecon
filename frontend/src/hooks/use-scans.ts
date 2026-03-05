import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useScans(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['scans', page, perPage],
    queryFn: () => api.listScans(page, perPage),
  })
}

export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => api.getScan(id),
    refetchInterval: (query) => {
      const status = query.state.data?.scan.status
      if (status === 'pending' || status === 'running') return 2000
      return false
    },
  })
}

export function useCreateScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createScan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scans'] }),
  })
}

export function useDeleteScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteScan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scans'] }),
  })
}

export function useCancelScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.cancelScan,
    onSuccess: (_data, scanId) => {
      qc.invalidateQueries({ queryKey: ['scan', scanId] })
      qc.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: api.getStats })
}

export function useApiKeys() {
  return useQuery({ queryKey: ['api-keys'], queryFn: api.listApiKeys })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}
