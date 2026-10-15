import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useCustomer, useCustomers, useUpdateCustomer } from '../../hooks/useAdminQueries';
import { errorMessage } from '../../services';
import { formatDate, formatDateTime, formatINR } from '../../../utils/format';
import { useAdminUser } from '../shared/AdminGuard';
import { useToast } from '../shared/Toast';
import { Button, Card, Drawer, EmptyState, ErrorBox, PageBar, Pagination, Pill, SearchBox, Select, Spinner, Table, orderTone, useDebounced } from '../shared/ui';

const AdminCustomers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('customer');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, status, role]);
  const { data, isLoading, error, refetch } = useCustomers({ search: q, status, role, page });

  return (
    <div>
      <PageBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name or email" />
        <Select value={role} onChange={(e) => setRole(e.target.value)}><option value="customer">Customers</option><option value="staff">Staff team</option><option value="all">Everyone</option></Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any status</option><option value="active">Active</option><option value="blocked">Blocked</option></Select>
      </PageBar>
      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.results.length === 0 ? <EmptyState icon={<Users className="w-6 h-6" />} title="No customers found" hint="People who sign up on your website will appear here." /> : (
            <>
              <Table head={['Customer', 'Joined', 'Orders', 'Total spent', 'Status']} right={[2, 3]}>
                {data.results.map((c) => (
                  <tr key={c.id} onClick={() => setOpen(c.id)} className="hover:bg-blue-50/40 cursor-pointer">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.name}{c.is_staff && <span className="ml-2"><Pill tone="indigo">Staff</Pill></span>}</p><p className="text-xs text-gray-400">{c.email}</p></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.joined)}</td>
                    <td className="px-4 py-3 text-right">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatINR(c.total_spent)}</td>
                    <td className="px-4 py-3"><Pill tone={c.is_active ? 'green' : 'red'}>{c.is_active ? 'Active' : 'Blocked'}</Pill></td>
                  </tr>
                ))}
              </Table>
              <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
            </>
          )}
      </Card>
      {open !== null && <CustomerDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

const CustomerDrawer: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
  const { data: c, isLoading } = useCustomer(id);
  const update = useUpdateCustomer();
  const me = useAdminUser();
  const { addToast } = useToast();
  const run = (body: { is_active?: boolean; is_staff?: boolean }, ok: string) =>
    update.mutate({ id, body }, { onSuccess: () => addToast(ok, 'success'), onError: (e) => addToast(errorMessage(e), 'error') });

  return (
    <Drawer title="Customer" onClose={onClose}>
      {isLoading || !c ? <Spinner /> : (
        <div className="space-y-5 text-sm">
          <div><p className="text-lg font-bold text-gray-900">{c.name}</p><p className="text-gray-500">{c.email}</p>
            <div className="mt-2 flex gap-2"><Pill tone={c.is_active ? 'green' : 'red'}>{c.is_active ? 'Active' : 'Blocked'}</Pill>{c.is_staff && <Pill tone="indigo">Staff</Pill>}</div></div>
          <div className="grid grid-cols-3 gap-3">
            {[['Orders', String(c.order_count)], ['Spent', formatINR(c.total_spent)], ['Joined', formatDate(c.joined)]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">{l}</p><p className="font-semibold text-gray-900">{v}</p></div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Last login: {c.last_login ? formatDateTime(c.last_login) : 'never'}</p>
          <div className="flex flex-wrap gap-2">
            {c.is_active
              ? <Button variant="danger" size="sm" loading={update.isPending} disabled={me?.id === c.id} onClick={() => run({ is_active: false }, 'Customer blocked')}>Block this account</Button>
              : <Button variant="success" size="sm" loading={update.isPending} onClick={() => run({ is_active: true }, 'Customer unblocked')}>Unblock</Button>}
            {me?.is_superuser && me.id !== c.id && (
              <Button variant="secondary" size="sm" onClick={() => run({ is_staff: !c.is_staff }, c.is_staff ? 'Admin access removed' : 'Admin access given')}>
                {c.is_staff ? 'Remove admin access' : 'Make staff (admin panel access)'}
              </Button>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Recent orders</h4>
            {!c.orders || c.orders.length === 0 ? <p className="text-gray-400">No orders yet.</p> : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {c.orders.map((o) => (
                  <div key={o.order_number} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1"><p className="font-medium text-blue-700">{o.order_number}</p><p className="text-xs text-gray-400">{formatDateTime(o.created_at)}</p></div>
                    <Pill tone={orderTone(o.status)}>{o.status_display}</Pill><span className="font-semibold w-24 text-right">{formatINR(o.order_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default AdminCustomers;
