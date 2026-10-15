import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi, errorMessage } from '../../services';
import { Invoice, InvoiceFrame } from '../../../shared/InvoiceView';
import AdminGuard from './AdminGuard';

/** Printable invoice for staff (opens in its own tab, without the admin menus). */
const Inner: React.FC = () => {
  const { orderNumber = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminApi.getInvoice(orderNumber).then(setInvoice).catch((e) => setError(errorMessage(e, 'Could not load this invoice.'))).finally(() => setLoading(false));
  }, [orderNumber]);
  return <InvoiceFrame invoice={invoice} error={error} loading={loading} backHref="/orders" />;
};

const AdminInvoicePage: React.FC = () => <AdminGuard><Inner /></AdminGuard>;
export default AdminInvoicePage;
