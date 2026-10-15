import React, { useState } from 'react';
import { useDashboard } from '../../hooks/useAdminQueries';
import { errorMessage } from '../../services';
import { formatINR } from '../../../utils/format';
import { Card, ErrorBox, Pill, Select, Spinner, orderTone } from '../shared/ui';

const LABEL: Record<string, string> = { pending: 'Waiting for payment', confirmed: 'Confirmed', processing: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', return_requested: 'Return requested', returned: 'Returned' };

const AdminAnalytics: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch } = useDashboard(days);
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />;
  const total = Object.values(data.orders_by_status).reduce((a, b) => a + b, 0) || 1;
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Based on confirmed, packed, shipped and delivered orders.</p>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last year</option></Select>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[['Sales', formatINR(k.revenue)], ['Orders', String(k.orders)], ['Average order value', formatINR(k.avg_order_value)]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl border border-gray-100 p-5"><p className="text-sm text-gray-500">{l}</p><p className="text-3xl font-bold text-gray-900 mt-1">{v}</p></div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Orders by status">
          <div className="space-y-3">
            {Object.entries(data.orders_by_status).map(([s, n]) => (
              <div key={s}><div className="flex justify-between text-sm mb-1"><Pill tone={orderTone(s)}>{LABEL[s] || s}</Pill><span className="font-semibold">{n}</span></div>
                <div className="h-2 bg-gray-100 rounded"><div className="h-2 rounded bg-blue-500" style={{ width: `${(n / total) * 100}%` }} /></div></div>
            ))}
            {Object.keys(data.orders_by_status).length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
          </div>
        </Card>
        <Card title="Top products by sales">
          {data.top_products.length === 0 ? <p className="text-sm text-gray-400">No sales in this period.</p> : (
            <div className="space-y-3">
              {data.top_products.map((p) => {
                const max = Number(data.top_products[0].revenue) || 1;
                return (<div key={p.name}><div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-800">{p.name}</span><span className="text-gray-500">{p.units} sold · {formatINR(p.revenue)}</span></div>
                  <div className="h-2 bg-gray-100 rounded"><div className="h-2 rounded bg-emerald-500" style={{ width: `${(Number(p.revenue) / max) * 100}%` }} /></div></div>);
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
