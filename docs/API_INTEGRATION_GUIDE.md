# Admin Panel API Integration Guide

## ✅ What's Ready

The admin panel is now set up for complete API integration with your Django backend:

### 1. API Client Layer (`src/admin/services/adminApi.ts`)
- All CRUD operations mapped to Django endpoints
- Handles: Products, Orders, Customers, Inventory, Promotions, Analytics, Settings
- Type-safe method signatures with TypeScript

### 2. React Query Hooks (`src/admin/hooks/useAdminQueries.ts`)
- `useProducts`, `useOrders`, `useCustomers`, etc.
- Automatic caching & refetching
- Mutation hooks for create/update/delete
- Query invalidation on mutations

### 3. Toast Notifications (`src/admin/components/shared/Toast.tsx`)
- Success, error, warning, info types
- Auto-dismiss after 3 seconds
- Ready to use with mutations

### 4. Query Client Configuration (`src/admin/services/queryClient.ts`)
- Centralized React Query setup
- 5-min stale time, 10-min cache time
- Retry logic enabled

---

## 🔌 How to Enable API Integration

### Step 1: Update AdminLayout.tsx (Already Done ✓)
Wraps everything with QueryClientProvider and ToastProvider.

### Step 2: Create Backend API Endpoints

Your Django backend needs these endpoints (use existing ones if available):

```python
# Products
GET    /api/v1/catalog/products/
POST   /api/v1/catalog/products/
GET    /api/v1/catalog/products/{id}/
PUT    /api/v1/catalog/products/{id}/
DELETE /api/v1/catalog/products/{id}/

# Orders
GET    /api/v1/checkout/orders/
GET    /api/v1/checkout/orders/{id}/
PATCH  /api/v1/checkout/orders/{id}/
GET    /api/v1/checkout/orders/{id}/invoice/

# Customers
GET    /api/v1/accounts/customers/
GET    /api/v1/accounts/customers/{id}/
GET    /api/v1/accounts/customers/{id}/orders/

# Inventory
GET    /api/v1/catalog/inventory/
PATCH  /api/v1/catalog/inventory/{id}/

# Promotions
GET    /api/v1/catalog/promotions/
POST   /api/v1/catalog/promotions/
PUT    /api/v1/catalog/promotions/{id}/
DELETE /api/v1/catalog/promotions/{id}/

# Analytics
GET    /api/v1/analytics/sales/
GET    /api/v1/analytics/revenue-by-category/
GET    /api/v1/analytics/order-stats/

# Settings
GET    /api/v1/core/settings/
PATCH  /api/v1/core/settings/
```

### Step 3: Uncomment API Calls in Components

Example for `AdminProducts.tsx`:

**Before (mock):**
```typescript
const [products, setProducts] = useState<Product[]>(mockProducts);
```

**After (API):**
```typescript
// Uncomment this:
const { data: apiResponse, isLoading: apiLoading, error } = useProducts();
const products = apiResponse?.results ?? [];

// Add error handling:
if (error) {
  useToast().addToast('Failed to load products', 'error');
}
```

### Step 4: Wire Mutations to Save Handlers

In `AdminProducts.tsx`, update `handleSave`:

```typescript
const handleSave = async (data: Partial<Product>) => {
  try {
    if (editProduct) {
      await updateMutation.mutateAsync({ 
        id: editProduct.id, 
        data 
      });
      useToast().addToast('Product updated successfully', 'success');
    } else {
      await createMutation.mutateAsync(data);
      useToast().addToast('Product created successfully', 'success');
    }
  } catch (error) {
    useToast().addToast('Error saving product', 'error');
  }
};
```

### Step 5: Apply Same Pattern to Other Components

- `AdminOrders.tsx` → Use `useOrders`, `useUpdateOrderStatus`
- `AdminCustomers.tsx` → Use `useCustomers`, `useCustomer`
- `AdminInventory.tsx` → Use `useInventory`, `useUpdateInventory`
- `AdminPromotions.tsx` → Use `usePromotions`, `useCreatePromotion`, etc.
- `AdminAnalytics.tsx` → Use `useSalesAnalytics`, `useRevenueByCategory`
- `AdminSettings.tsx` → Use `useStoreSettings`, `useUpdateStoreSettings`

---

## 🧪 Testing Without Backend

The admin panel currently works with **mock data** from `mockData.ts`.

To test with mock data:
1. No API changes needed
2. Everything works offline
3. All CRUD operations work locally (state-based)

To switch to API calls:
1. Uncomment the API hooks
2. Ensure backend is running
3. Comment out mock data usage

---

## 📊 Response Format Expectations

### Products List Response
```json
{
  "count": 50,
  "next": "http://...",
  "previous": null,
  "results": [
    {
      "id": "1",
      "name": "Extension Board",
      "sku": "EB-6A-4S",
      "category": "Extension Boards",
      "price": 499,
      "mrp": 699,
      "stock": 145,
      "status": "active"
    }
  ]
}
```

### Orders List Response
```json
{
  "count": 100,
  "results": [
    {
      "id": "1",
      "order_number": "ORD-2026-001287",
      "customer": "Ananya Sharma",
      "total": 5497,
      "status": "delivered",
      "payment_status": "paid",
      "created_at": "2026-09-30T09:15:00"
    }
  ]
}
```

---

## 🔒 Error Handling

The hooks already handle errors. In components:

```typescript
const { data, isLoading, error } = useProducts();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorBoundary error={error} />;
```

For mutations:

```typescript
const mutation = useUpdateProduct();

try {
  await mutation.mutateAsync({ id, data });
} catch (error) {
  console.error('Update failed:', error);
}
```

---

## 🔄 Data Sync Strategy

1. **Automatic**: React Query handles refetching based on `staleTime`
2. **On Mutation**: Hooks auto-invalidate related queries
3. **Manual**: Call `queryClient.invalidateQueries()` if needed

Example:
```typescript
const queryClient = useQueryClient();

// After updating a product:
await updateMutation.mutateAsync(data);
// ↑ This automatically refetches products list

// Or manually:
queryClient.invalidateQueries({ queryKey: ['products'] });
```

---

## 🚀 Current Status

✅ **Mock data working** — All 8 sections functional
✅ **API client ready** — All methods defined
✅ **Hooks ready** — React Query configured
✅ **Toast system ready** — Notifications set up
✅ **Error handling ready** — Try-catch patterns in place

**Next step**: Uncomment API calls when backend is ready

---

## 📝 Implementation Checklist

- [ ] Create backend endpoints (or use existing ones)
- [ ] Update `AdminProducts.tsx` to use `useProducts` hook
- [ ] Update `AdminOrders.tsx` to use `useOrders` hook
- [ ] Update `AdminCustomers.tsx` to use `useCustomers` hook
- [ ] Update `AdminInventory.tsx` to use `useInventory` hook
- [ ] Update `AdminPromotions.tsx` to use `usePromotions` hook
- [ ] Update `AdminAnalytics.tsx` to use `useSalesAnalytics` hook
- [ ] Update `AdminSettings.tsx` to use `useStoreSettings` hook
- [ ] Test with real data
- [ ] Add error boundaries
- [ ] Test loading states
- [ ] Test error states
- [ ] Load testing (100+ products, orders, etc.)

---

## 🎯 File Structure for Reference

```
frontend/src/admin/
├── services/
│   ├── adminApi.ts          ← API client class
│   ├── queryClient.ts       ← React Query config
│   └── index.ts             ← Exports
├── hooks/
│   └── useAdminQueries.ts   ← All query/mutation hooks
├── components/shared/
│   └── Toast.tsx            ← Toast notification system
└── ...rest of admin panel
```

---

**Status**: API integration layer complete. Ready to connect to Django backend.
