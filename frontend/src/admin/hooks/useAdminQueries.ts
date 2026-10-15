import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services';
import type { ProductInput } from '../types';

type Params = Record<string, string | number | undefined>;
const fresh = { staleTime: 15_000 };

export const useDashboard = (days = 30) =>
  useQuery({ queryKey: ['admin', 'dashboard', days], queryFn: () => adminApi.dashboard(days), ...fresh });

// ─── Orders ─────────────────────────────────────────────────────────────────
export const useOrders = (params?: Params) =>
  useQuery({ queryKey: ['admin', 'orders', params], queryFn: () => adminApi.getOrders(params), ...fresh, placeholderData: (prev) => prev });
export const useOrder = (number: string | null) =>
  useQuery({ queryKey: ['admin', 'order', number], queryFn: () => adminApi.getOrder(number!), enabled: !!number, ...fresh });

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, body }: { number: string; body: Parameters<typeof adminApi.updateOrder>[1] }) =>
      adminApi.updateOrder(number, body),
    onSuccess: (order) => {
      qc.setQueryData(['admin', 'order', order.order_number], order);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stock'] });
    },
  });
};
export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => adminApi.createOrder(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
};

// ─── Products & categories ──────────────────────────────────────────────────
export const useProducts = (params?: Params) =>
  useQuery({ queryKey: ['admin', 'products', params], queryFn: () => adminApi.getProducts(params), ...fresh, placeholderData: (prev) => prev });
export const useProduct = (id?: string) =>
  useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminApi.getProduct(id!), enabled: !!id, staleTime: 0 });

const refreshCatalog = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['admin', 'products'] });
  qc.invalidateQueries({ queryKey: ['admin', 'product'] });
  qc.invalidateQueries({ queryKey: ['admin', 'stock'] });
  qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
  qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
};

export const useSaveProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<ProductInput> }) =>
      id ? adminApi.updateProduct(id, body) : adminApi.createProduct(body as ProductInput),
    onSuccess: () => refreshCatalog(qc),
  });
};
export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminApi.deleteProduct(id), onSuccess: () => refreshCatalog(qc) });
};

export const useCategories = () =>
  useQuery({ queryKey: ['admin', 'categories'], queryFn: () => adminApi.getCategories(), ...fresh });
export const useSaveCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? adminApi.updateCategory(id, body) : adminApi.createCategory(body),
    onSuccess: () => refreshCatalog(qc),
  });
};
export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminApi.deleteCategory(id), onSuccess: () => refreshCatalog(qc) });
};

// ─── Stock ──────────────────────────────────────────────────────────────────
export const useStock = (params?: Params) =>
  useQuery({ queryKey: ['admin', 'stock', params], queryFn: () => adminApi.getStock(params), ...fresh, placeholderData: (prev) => prev });
export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof adminApi.adjustStock>[0]) => adminApi.adjustStock(body),
    onSuccess: () => refreshCatalog(qc),
  });
};

// ─── Customers ──────────────────────────────────────────────────────────────
export const useCustomers = (params?: Params) =>
  useQuery({ queryKey: ['admin', 'customers', params], queryFn: () => adminApi.getCustomers(params), ...fresh, placeholderData: (prev) => prev });
export const useCustomer = (id: number | null) =>
  useQuery({ queryKey: ['admin', 'customer', id], queryFn: () => adminApi.getCustomer(id!), enabled: id !== null, staleTime: 0 });
export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { is_active?: boolean; is_staff?: boolean } }) => adminApi.updateCustomer(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'customer'] });
    },
  });
};

// ─── Coupons ────────────────────────────────────────────────────────────────
export const useCoupons = (params?: Params) =>
  useQuery({ queryKey: ['admin', 'coupons', params], queryFn: () => adminApi.getCoupons(params), ...fresh });
export const useSaveCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? adminApi.updateCoupon(id, body as any) : adminApi.createCoupon(body as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
};
export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminApi.deleteCoupon(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }) });
};

// ─── Store settings ─────────────────────────────────────────────────────────
export const useSettings = () =>
  useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminApi.getSettings(), staleTime: 0 });
export const useSaveSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof adminApi.saveSettings>[0]) => adminApi.saveSettings(body),
    onSuccess: (data) => qc.setQueryData(['admin', 'settings'], data),
  });
};

// ─── Website content ────────────────────────────────────────────────────────
export const useBanners = () => useQuery({ queryKey: ['admin', 'banners'], queryFn: () => adminApi.getBanners(), staleTime: 0 });
export const useSaveBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? adminApi.updateBanner(id, body as any) : adminApi.createBanner(body as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banners'] }),
  });
};
export const useDeleteBanner = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminApi.deleteBanner(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banners'] }) });
};
export const useFeatured = () => useQuery({ queryKey: ['admin', 'featured'], queryFn: () => adminApi.getFeatured(), staleTime: 0 });
export const useSaveFeatured = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids: string[]) => adminApi.saveFeatured(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'featured'] }) });
};
export const usePages = () => useQuery({ queryKey: ['admin', 'pages'], queryFn: () => adminApi.getPages(), staleTime: 0 });
export const useSavePage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: { title: string; content: string; is_published: boolean } }) => adminApi.savePage(slug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pages'] }),
  });
};
