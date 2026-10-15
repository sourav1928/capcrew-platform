import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Warehouse } from 'lucide-react';
import { useAdjustStock, useStock } from '../../hooks/useAdminQueries';
import { errorMessage } from '../../services';
import type { StockRow } from '../../types';
import { formatINR } from '../../../utils/format';
import { useToast } from '../shared/Toast';
import { Button, Card, EmptyState, ErrorBox, Field, Modal, PageBar, Pagination, Pill, SearchBox, Select, Spinner, Table, inputCls, stockLabel, stockTone, useDebounced } from '../shared/ui';

const AdminInventory: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'all';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [row, setRow] = useState<StockRow | null>(null);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [filter, q]);
  const { data, isLoading, error, refetch } = useStock({ filter: filter === 'all' ? undefined : filter, search: q, page });

  return (
    <div>
      <PageBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search product or code" />
        <Select value={filter} onChange={(e) => setParams(e.target.value === 'all' ? {} : { filter: e.target.value })}>
          <option value="all">All items</option><option value="low">Running low</option><option value="out">Out of stock</option>
        </Select>
        <p className="text-sm text-gray-500 sm:ml-auto">Tip: click “Update stock” after you receive new goods.</p>
      </PageBar>
      <Card pad={false}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorBox message={errorMessage(error)} onRetry={() => refetch()} /></div> :
          !data || data.results.length === 0 ? <EmptyState icon={<Warehouse className="w-6 h-6" />} title="Nothing to show" hint="Add products first, then manage their stock here." /> : (
            <>
              <Table head={['Product', 'Code', 'Price', 'Available', 'Status', '']} right={[2, 3]}>
                {data.results.map((s) => (
                  <tr key={s.sku_id} className={s.active ? '' : 'opacity-50'}>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{s.product_name}</p><p className="text-xs text-gray-400">{s.variant_name}{s.active ? '' : ' · hidden'}</p></td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.sku_code}</td>
                    <td className="px-4 py-3 text-right">{formatINR(s.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{s.stock}</td>
                    <td className="px-4 py-3"><Pill tone={stockTone(s.state)}>{stockLabel(s.state)}</Pill></td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setRow(s)}>Update stock</Button></td>
                  </tr>
                ))}
              </Table>
              <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
            </>
          )}
      </Card>
      {row && <StockModal row={row} onClose={() => setRow(null)} />}
    </div>
  );
};

const StockModal: React.FC<{ row: StockRow; onClose: () => void }> = ({ row, onClose }) => {
  const adjust = useAdjustStock();
  const { addToast } = useToast();
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const save = () => {
    const n = parseInt(value);
    if (isNaN(n) || (mode === 'set' && n < 0)) { setErr('Enter a valid number'); return; }
    adjust.mutate(mode === 'set' ? { sku_code: row.sku_code, set_to: n, notes: note } : { sku_code: row.sku_code, change: n, notes: note }, {
      onSuccess: (r) => { addToast(`${row.product_name}: ${r.stock} in stock`, 'success'); onClose(); },
      onError: (e) => setErr(errorMessage(e)),
    });
  };
  return (
    <Modal title={`${row.product_name} (${row.variant_name})`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={adjust.isPending} onClick={save}>Save</Button></>}>
      <p className="text-sm text-gray-600 mb-4">Currently <strong>{row.stock}</strong> available.</p>
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant={mode === 'add' ? 'primary' : 'secondary'} onClick={() => setMode('add')}>Add / remove</Button>
        <Button size="sm" variant={mode === 'set' ? 'primary' : 'secondary'} onClick={() => setMode('set')}>Set exact number</Button>
      </div>
      <Field label={mode === 'add' ? 'How many to add? (use a minus sign to remove)' : 'New stock quantity'} error={err}>
        <input autoFocus type="number" className={inputCls(err)} value={value} onChange={(e) => { setValue(e.target.value); setErr(''); }}
          placeholder={mode === 'add' ? 'e.g. 25 or -3' : 'e.g. 100'} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
      <Field className="mt-3" label="Note (optional)"><input className={inputCls()} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New delivery from supplier" /></Field>
    </Modal>
  );
};

export default AdminInventory;
