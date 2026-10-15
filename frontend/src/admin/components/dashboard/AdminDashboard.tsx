import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, IndianRupee, Package, ShoppingBag, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useDashboard } from '../../hooks/useAdminQueries';
import { errorMessage } from '../../services';
import { formatDateTime, formatINR } from '../../../utils/format';
import { Card, ErrorBox, Pill, Select, Spinner, Table, orderTone, paymentTone } from '../shared/ui';

const Change: React.FC<{ value: number | null }> = ({ value }) =>
  value === null ? <span className="text-xs text-gray-400">no earlier data</span> : (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(value)}% vs previous period
    </span>
  );

const Kpi: React.FC<{ label: string; value: string; icon: React.ReactNode; foot: React.ReactNode; tone: string }> = ({ label, value, icon, foot, tone }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5">
    <div className="flex items-center justify-between mb-3"><p className="text-sm text-gray-500 font-medium">{label}</p>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>{icon}</span></div>
    <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
    <div className="mt-1 min-h-[1rem]">{foot}</div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch } = useDashboard(days);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />;
  const k = data.kpis;
  const max = Math.max(1, ...data.chart.map((d) => Number(d.revenue)));
  const needsAction = k.pending_orders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Your store at a glance</h2>
          <p className="text-sm text-gray-500">Numbers come straight from your real orders.</p>
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </Select>
      </div>

      {needsAction > 0 && (
        <Link to="/orders?status=confirmed" className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 p-4 hover:bg-blue-100">
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold">{needsAction} order{needsAction > 1 ? 's' : ''} waiting for you</span>
          <span className="text-sm ml-auto">View orders →</span>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Sales" value={formatINR(k.revenue)} tone="bg-emerald-50 text-emerald-600" icon={<IndianRupee className="w-5 h-5" />} foot={<Change value={k.revenue_change} />} />
        <Kpi label="Orders" value={String(k.orders)} tone="bg-blue-50 text-blue-600" icon={<ShoppingBag className="w-5 h-5" />} foot={<Change value={k.orders_change} />} />
        <Kpi label="Average order" value={formatINR(k.avg_order_value)} tone="bg-violet-50 text-violet-600" icon={<Package className="w-5 h-5" />} foot={<span className="text-xs text-gray-400">excludes cancelled & unpaid online orders</span>} />
        <Kpi label="New customers" value={String(k.new_customers)} tone="bg-amber-50 text-amber-600" icon={<Users className="w-5 h-5" />} foot={<span className="text-xs text-gray-400">{k.total_customers} customers in total</span>} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Sales per day" className="lg:col-span-2">
          <div className="flex items-end gap-[3px] h-48" role="img" aria-label="Daily sales chart">
            {data.chart.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col justify-end group relative min-w-0">
                <div className="bg-blue-500 hover:bg-blue-600 rounded-t transition-colors" style={{ height: `${Math.max(2, (Number(d.revenue) / max) * 100)}%` }} />
                <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {formatINR(d.revenue)} · {d.orders} order{d.orders === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{new Date(data.chart[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>Today</span>
          </div>
        </Card>

        <Card title="Best sellers">
          {data.top_products.length === 0 ? <p className="text-sm text-gray-400">No sales in this period yet.</p> : (
            <ol className="space-y-3">
              {data.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{p.name}</p><p className="text-xs text-gray-400">{p.units} sold</p></div>
                  <span className="font-semibold">{formatINR(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Recent orders" className="lg:col-span-2" pad={false}
          action={<Link to="/orders" className="text-sm text-blue-600 font-medium hover:underline">View all</Link>}>
          {data.recent_orders.length === 0 ? <p className="p-5 text-sm text-gray-400">No orders yet. They will appear here as soon as customers buy.</p> : (
            <Table head={['Order', 'Customer', 'Total', 'Payment', 'Status']} right={[2]}>
              {data.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><Link to="/orders" className="font-semibold text-blue-700 hover:underline">{o.order_number}</Link><p className="text-xs text-gray-400">{formatDateTime(o.created_at)}</p></td>
                  <td className="px-4 py-3 text-gray-700">{o.customer_name || o.customer_email}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatINR(o.order_total)}</td>
                  <td className="px-4 py-3"><Pill tone={paymentTone(o.payment_status)}>{o.payment_status_display}</Pill></td>
                  <td className="px-4 py-3"><Pill tone={orderTone(o.status)}>{o.status_display}</Pill></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Running low on stock" action={<Link to="/inventory?filter=low" className="text-sm text-blue-600 font-medium hover:underline">Manage</Link>}>
          {data.low_stock.length === 0 ? <p className="text-sm text-gray-400">Everything is well stocked.</p> : (
            <ul className="space-y-3">
              {data.low_stock.map((s) => (
                <li key={s.sku_code} className="flex items-center gap-3 text-sm">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${s.stock === 0 ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{s.product_name}</p><p className="text-xs text-gray-400">{s.variant_name}</p></div>
                  <Pill tone={s.stock === 0 ? 'red' : 'amber'}>{s.stock === 0 ? 'Out' : `${s.stock} left`}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
