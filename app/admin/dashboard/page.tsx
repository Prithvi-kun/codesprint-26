import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboard from './admin-client'

export default function AdminDashboardPage() {
    const cookieStore = cookies()
    const adminSession = cookieStore.get('admin_session')?.value
    const adminRole = cookieStore.get('admin_role')?.value || 'pitboss'
    const adminLabel = cookieStore.get('admin_label')?.value || 'Pit Boss Alpha'

    if (adminSession !== 'authenticated') {
        redirect('/admin')
    }

    return <AdminDashboard adminRole={adminRole} adminLabel={adminLabel} />
}
