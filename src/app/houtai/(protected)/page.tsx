import AdminDashboardView from '@/components/houtai/AdminDashboardView'
import { getAdminDashboardData } from '@/lib/services/admin-dashboard-service'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const dashboardData = await getAdminDashboardData()

  return <AdminDashboardView data={dashboardData} />
}
