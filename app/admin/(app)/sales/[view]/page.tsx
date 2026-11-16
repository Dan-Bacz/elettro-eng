import AdminSalesView from '../../../../../components/admin/AdminSalesView'

const VIEWS = ['orders', 'completed', 'receipts', 'payments', 'warehouse-requests', 'stock'] as const
type SalesView = (typeof VIEWS)[number]

export default async function AdminSalesViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params
  const selected = VIEWS.includes(view as SalesView) ? view as SalesView : 'orders'
  return <AdminSalesView view={selected} />
}
