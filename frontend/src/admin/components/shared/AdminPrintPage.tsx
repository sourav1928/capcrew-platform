import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, errorMessage } from '../../services';
import { InvoiceView, Invoice } from '../../../shared/InvoiceView';
import { LabelData, LabelSize, ShippingLabel } from '../../../shared/ShippingLabel';
import AdminGuard from './AdminGuard';

type Loaded = { doc: 'label' | 'invoice'; documents: any[]; skipped: Array<{ order_number: string; reason: string }> };

/** Prints shipping labels or invoices for one or many orders (opens in its own tab). */
const Inner: React.FC = () => {
  const [params] = useSearchParams();
  const doc = params.get('doc') === 'invoice' ? 'invoice' : 'label';
  const orders = (params.get('orders') || '').split(',').filter(Boolean);
  const [size, setSize] = useState<LabelSize>(params.get('size') === 'a6' ? 'a6' : 'thermal');
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.bulkPrint(doc, orders).then(setData).catch((e) => setError(errorMessage(e, 'Could not load these documents.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The paper size is decided by CSS, so set it to match what is being printed.
  useEffect(() => {
    const css = doc === 'invoice'
      ? '@page { size: A4; margin: 12mm; }'
      : size === 'thermal' ? '@page { size: 100mm 150mm; margin: 0; }' : '@page { size: A4; margin: 0; }';
    const el = document.createElement('style');
    el.id = 'print-page-size';
    el.textContent = css + ' @media print { html, body { background: #fff !important; } }';
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [doc, size]);

  const docs = data?.documents || [];
  const sheets: any[][] = [];
  if (doc === 'label' && size === 'a6') for (let i = 0; i < docs.length; i += 4) sheets.push(docs.slice(i, i + 4));

  return (
    <div className="min-h-screen bg-gray-200 print:bg-white py-6 print:py-0">
      <div className="max-w-4xl mx-auto mb-5 px-4 print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="font-bold text-gray-900">{doc === 'label' ? 'Shipping labels' : 'Invoices'} · {docs.length} {docs.length === 1 ? 'order' : 'orders'}</p>
            <p className="text-xs text-gray-500">
              {doc === 'invoice' ? 'Print on A4 paper and put one inside each parcel.' : 'Stick one label on the outside of each parcel.'}
            </p>
          </div>
          {doc === 'label' && (
            <label className="text-sm text-gray-700 flex items-center gap-2">
              Paper
              <select value={size} onChange={(e) => setSize(e.target.value as LabelSize)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                <option value="thermal">Label printer (4 × 6 inch)</option>
                <option value="a6">Normal A4 printer (4 labels per sheet)</option>
              </select>
            </label>
          )}
          <button onClick={() => window.print()} disabled={docs.length === 0}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 text-sm">Print</button>
          <button onClick={() => window.close()} className="text-sm text-gray-600 hover:underline">Close</button>
        </div>
        {data && data.skipped.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
            <p className="font-semibold mb-1">Left out:</p>
            <ul className="list-disc ml-5">{data.skipped.map((s) => <li key={s.order_number}>{s.order_number}: {s.reason}</li>)}</ul>
          </div>
        )}
        {doc === 'label' && size === 'a6' && docs.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">Tip: in the print window set Scale to “100%” (not “Fit to page”) and Margins to “None”, so the labels stay the right size.</p>
        )}
      </div>

      {error && <p className="text-center text-red-600 py-16">{error}</p>}
      {!data && !error && <p className="text-center text-gray-500 py-16">Getting your documents ready…</p>}
      {data && docs.length === 0 && <p className="text-center text-gray-500 py-16">Nothing to print.</p>}

      {doc === 'invoice' && docs.map((inv: Invoice, i) => (
        <div key={inv.invoice_number} className="px-4 print:px-0 mb-6 print:mb-0" style={{ breakAfter: i < docs.length - 1 ? 'page' : 'auto', pageBreakAfter: i < docs.length - 1 ? 'always' : 'auto' }}>
          <InvoiceView invoice={inv} />
        </div>
      ))}

      {doc === 'label' && size === 'thermal' && docs.map((l: LabelData, i) => (
        <div key={l.order_number} className="flex justify-center mb-6 print:mb-0" style={{ breakAfter: i < docs.length - 1 ? 'page' : 'auto', pageBreakAfter: i < docs.length - 1 ? 'always' : 'auto' }}>
          <div className="shadow-md print:shadow-none"><ShippingLabel label={l} size="thermal" /></div>
        </div>
      ))}

      {doc === 'label' && size === 'a6' && sheets.map((sheet, si) => (
        <div key={si} className="flex justify-center mb-6 print:mb-0" style={{ breakAfter: si < sheets.length - 1 ? 'page' : 'auto', pageBreakAfter: si < sheets.length - 1 ? 'always' : 'auto' }}>
          <div className="bg-white shadow-md print:shadow-none" style={{ display: 'grid', gridTemplateColumns: '105mm 105mm', gridAutoRows: '148mm', width: '210mm' }}>
            {sheet.map((l: LabelData) => (
              <div key={l.order_number} style={{ outline: '0.3mm dashed #999', outlineOffset: '-0.3mm' }}><ShippingLabel label={l} size="a6" /></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminPrintPage: React.FC = () => <AdminGuard><Inner /></AdminGuard>;
export default AdminPrintPage;
