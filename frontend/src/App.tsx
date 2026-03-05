import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute, AdminRoute } from '@/components/protected-route'
import { Layout } from '@/components/layout'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import PendingPage from '@/pages/pending'
import DashboardPage from '@/pages/dashboard'
import NewScanPage from '@/pages/new-scan'
import ScanResultsPage from '@/pages/scan-results'
import HistoryPage from '@/pages/history'
import SettingsPage from '@/pages/settings'
import AdminUsersPage from '@/pages/admin-users'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/scans/new" element={<NewScanPage />} />
              <Route path="/scans/:id" element={<ScanResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
