# Quick Start Guide — Admin Panel

## 🚀 Start Here

### 1. Run the dev server
```bash
cd frontend
npm run dev
```

### 2. Open admin panel
Navigate to: **http://localhost:5173/admin**

### 3. Explore sections via sidebar
- Click "Dashboard" → KPIs + charts + activity
- Click "Products" → Add/edit/delete products
- Click "Orders" → Update order status
- Click "Customers" → View customer profiles
- Click "Inventory" → Stock tracking
- Click "Analytics" → Sales reports
- Click "Promotions" → Manage coupons
- Click "Settings" → Store configuration

---

## 📁 Key Files

### Entry Point
```
frontend/src/pages/admin/AdminPage.tsx
→ Imports AdminRouter from src/admin/AdminRouter.tsx
```

### Main Router
```
frontend/src/admin/AdminRouter.tsx
→ Wraps all sections in AdminLayout
→ Defines routes: /, /products, /orders, /customers, etc.
```

### Shared Components
```
frontend/src/admin/components/shared/
├── KPICard.tsx          (metric card with trend)
└── StatusBadge.tsx      (color-coded status labels)
```

### Layout Shell
```
frontend/src/admin/components/layout/
├── AdminLayout.tsx      (sidebar + header + content area)
├── AdminSidebar.tsx     (left navigation with sub-menus)
└── AdminHeader.tsx      (top bar with search, refresh, notifications)
```

### 8 Section Pages
```
frontend/src/admin/components/
├── dashboard/AdminDashboard.tsx
├── products/AdminProducts.tsx
├── orders/AdminOrders.tsx
├── customers/AdminCustomers.tsx
├── inventory/AdminInventory.tsx
├── analytics/AdminAnalytics.tsx
├── promotions/AdminPromotions.tsx
└── settings/AdminSettings.tsx
```

### Data & Types
```
frontend/src/admin/
├── types/index.ts       (interfaces: Product, Order, Customer, etc.)
└── utils/mockData.ts    (sample data for development)
```

---

## 🧪 Test Scenarios

### Test Products Section
1. Click "Products" in sidebar
2. View the product table with 8 items
3. Click "+ Add product" → Fill form → Click "Add product"
4. Edit a product → Click the pencil icon → Update → Save
5. Delete a product → Click trash → Confirm delete
6. Filter by status/category using dropdowns
7. Search for a product by name/SKU

### Test Orders Section
1. Click "Orders" in sidebar
2. View orders table with status badges
3. Change order status using inline dropdown
4. Click eye icon → See order detail modal
5. Click printer icon → Print button ready
6. Filter by status or payment status

### Test Customers Section
1. Click "Customers" in sidebar
2. Search for a customer
3. Click "View" → See customer profile modal
4. Check spending metrics, order count, last order date

### Test Inventory Section
1. Click "Inventory" in sidebar
2. See low stock alert (if items < reorder point)
3. Filter by status (In Stock, Low Stock, Out of Stock)
4. View inventory value calculations

### Test Dashboard
1. Click "Dashboard" (home icon)
2. See 4 KPI cards with trends
3. View 7-day revenue chart
4. See category breakdown
5. Check recent orders
6. Scroll activity feed

### Test Promotions Section
1. Click "Promotions" in sidebar
2. Click "+ Create promotion" → Fill form → Create
3. Click copy icon next to code → Should see checkmark
4. View usage progress bars
5. Delete a promotion → Trash icon

### Test Settings Section
1. Click "Settings" in sidebar
2. Edit store name, email, phone
3. Switch tabs (Shipping, Payment, Tax)
4. Click "Save changes" → See success toast
5. Verify timezone/currency/tax rate fields

---

## 🔧 How to Integrate with API

### Step 1: Install React Query (if not already)
```bash
npm install @tanstack/react-query
```

### Step 2: Replace mock data in a component
Example for AdminProducts.tsx:

**Before (mock):**
```typescript
const [products, setProducts] = useState<Product[]>(mockProducts);
```

**After (API):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

const AdminProducts: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.getProducts(),
  });

  // Add product mutation
  const addMutation = useMutation({
    mutationFn: (p: Partial<Product>) => 
      apiClient.createProduct(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Update product
  const updateMutation = useMutation({
    mutationFn: (p: Product) => 
      apiClient.updateProduct(p.id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // In your handlers:
  const handleSave = (data: Partial<Product>) => {
    addMutation.mutate(data);
  };

  // ... rest of component
};
```

### Step 3: Add API endpoints to your backend

Ensure your Django backend has these endpoints:

```python
# products/urls.py
path('api/v1/catalog/products/', ProductListView.as_view()),
path('api/v1/catalog/products/<int:pk>/', ProductDetailView.as_view()),

# orders/urls.py
path('api/v1/orders/', OrderListView.as_view()),
path('api/v1/orders/<int:pk>/', OrderDetailView.as_view()),
path('api/v1/orders/<int:pk>/status/', OrderStatusUpdateView.as_view()),

# customers/urls.py
path('api/v1/customers/', CustomerListView.as_view()),
path('api/v1/customers/<int:pk>/', CustomerDetailView.as_view()),

# ... etc
```

### Step 4: Update apiClient in frontend/src/services/api.ts

Add methods like:
```typescript
// In ApiClient class
createProduct(data: Partial<Product>) {
  return this.client.post('/catalog/products/', data);
}

updateProduct(id: string, data: Partial<Product>) {
  return this.client.put(`/catalog/products/${id}/`, data);
}

deleteProduct(id: string) {
  return this.client.delete(`/catalog/products/${id}/`);
}

// Orders
updateOrderStatus(orderId: string, status: OrderStatus) {
  return this.client.patch(`/orders/${orderId}/`, { status });
}

// ... etc
```

---

## 🎨 Customization

### Change colors
Edit `frontend/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#0EA5E9',    // Change from blue
      secondary: '#8B5CF6',  // Change accent
      // ...
    }
  }
}
```

### Change sidebar width
Edit `AdminSidebar.tsx`:
```typescript
// Change from w-64 (256px) to w-72 (288px)
aside className="... w-72 ..."
```

### Add new section
1. Create `frontend/src/admin/components/[section]/[SectionName].tsx`
2. Add to sidebar in `AdminSidebar.tsx`
3. Add route in `AdminRouter.tsx`
4. Add menu item in navItems array

### Enable dark mode
Add `<html class="dark">` to index.html and use Tailwind's dark mode utilities.

---

## 📊 Current Mock Data

### Sample Products (8 items)
- Extension boards, power strips, smart devices, accessories
- Prices: ₹199–₹2,499
- Stock levels: 0–312 units

### Sample Orders (8 items)
- Status: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
- Payment: Paid, Pending, Refunded
- Total: ₹699–₹8,295

### Sample Customers (8 items)
- Cities: Bangalore, Mumbai, Kolkata, Delhi, Pune, Chennai
- Total spend: ₹899–₹94,500
- Order count: 1–23

### Sample Inventory (7 items)
- Stock status: In Stock, Low Stock, Out of Stock
- Suppliers: Anchor, Havells, Syska, Belkin, Portronics

### Sample Promotions (5 items)
- Types: Percentage, Fixed, Free shipping
- Status: Active, Scheduled, Expired
- Usage: 0–634 redeemed

---

## ✅ Checklist Before Deployment

- [ ] Add authentication middleware
- [ ] Connect all sections to real API endpoints
- [ ] Add error handling & error boundaries
- [ ] Add loading spinners
- [ ] Add toast notifications (sonner or react-hot-toast)
- [ ] Test all CRUD operations
- [ ] Test responsive design on mobile
- [ ] Add audit logging
- [ ] Set up rate limiting on backend
- [ ] Test with real data volumes (100+ products, orders, etc.)
- [ ] Add keyboard shortcuts
- [ ] Implement role-based access control
- [ ] Add email notifications
- [ ] Set up invoice PDF generation
- [ ] Performance test with Chrome DevTools

---

## 🐛 Debugging

### Check console for errors
Open browser DevTools → Console tab

### Verify routes are working
Visit these URLs and you should see content:
- `http://localhost:5173/admin` → Dashboard
- `http://localhost:5173/admin/products` → Products
- `http://localhost:5173/admin/orders` → Orders
- etc.

### Check network requests (when API connected)
DevTools → Network tab → Look for API calls

### TypeScript errors?
Run: `npx tsc --noEmit` to check for type issues

---

## 📞 Troubleshooting

**Q: Admin panel doesn't load**
A: Check that `/admin/*` route is defined in main App.tsx

**Q: Sidebar doesn't appear**
A: Verify AdminSidebar component is imported in AdminLayout

**Q: Buttons don't work**
A: Check browser console for JavaScript errors

**Q: Styles look broken**
A: Verify tailwind.config.js is configured and `npm run dev` is running

**Q: Mock data not showing**
A: Check that mockData.ts is imported in each component

---

**Ready to go!** 🚀 Visit http://localhost:5173/admin and start exploring.
