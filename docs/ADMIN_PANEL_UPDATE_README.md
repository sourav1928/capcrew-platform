# CapCrew – real admin panel update

## Install (Windows)
1. Stop the Django and Vite servers.
2. Extract this zip into D:\Projects\ecommerce-platform and choose "Replace the files in the destination".
3. Nothing to migrate (no database changes). Just restart:
       cd backend && python manage.py runserver
       cd frontend && npm run dev
4. Make sure you have an owner account:  python manage.py createsuperuser
   (any account with is_staff = True can open the panel; customers are refused)
5. Log in on the website with that account, then open http://localhost:5173/admin
   (log out and in once if you were already logged in).

## What the admin panel can do now (all real data)
- Dashboard: sales, orders, best sellers, low-stock list, recent orders.
- Orders: search/filter, open an order, confirm / pack / ship / deliver / cancel (stock goes back),
  mark payment received, internal notes, history, create an order for a phone/walk-in customer.
- Products: add, edit, hide, delete; photo link, several price/stock options, categories tab.
- Inventory: add/remove stock or set an exact number.
- Customers: list, details, order history, block/unblock (owner can grant staff access).
- Promotions: create/edit/switch off discount coupons that work at checkout.
- Analytics: sales and order breakdowns.

## Notes
- The `update_status` action you added in backend/orders/views.py is kept untouched.
- Tests: python manage.py test adminapi orders   (33 tests)
