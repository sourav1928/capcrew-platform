# CapCrew – separate admin website + editable store settings

## Two websites, two addresses
| Site  | Run it                 | Local address          | Build for production                         |
|-------|------------------------|------------------------|----------------------------------------------|
| Shop  | `npm run dev`          | http://localhost:5175  | `npm run build`       -> `dist/`             |
| Admin | `npm run dev:admin`    | http://localhost:5176  | `npm run build:admin` -> `dist-admin/`       |

The shop contains NO admin code and has no /admin page at all. The admin site has its own
sign-in page and refuses accounts that are not staff.

## First time
1. Backend (venv active):  python manage.py migrate        (adds the store-settings table)
2. Make yourself the owner (once):
     python manage.py shell -c "from django.contrib.auth.models import User; u=User.objects.get(email='YOUR@EMAIL'); u.is_staff=True; u.is_superuser=True; u.save()"
3. Start three things: backend, `npm run dev`, `npm run dev:admin`.
4. Open http://localhost:5176 and sign in.

## Settings you can now change from Admin -> Settings (owner only)
GST rate, whether prices include GST, free-delivery amount, delivery fee, Cash on Delivery
on/off + limit, online payment on/off, max units per product, top-of-site banner, footer contact.
Changes apply to the website immediately. Old orders keep the amounts they were placed with.

## Going live (two deployments)
Backend .env:
    ADMIN_FRONTEND_ORIGINS=https://admin.yourshop.com
    CORS_ALLOWED_ORIGINS=https://www.yourshop.com,https://admin.yourshop.com
    ALLOWED_HOSTS=api.yourshop.com
Build the shop:   VITE_API_URL=https://api.yourshop.com/api/v1  npm run build
Build the admin:  copy .env.example.admin to .env.production.admin values, then
                  VITE_API_URL=https://api.yourshop.com/api/v1 VITE_SHOP_URL=https://www.yourshop.com npm run build:admin
Host `dist/` on www.yourshop.com and `dist-admin/` on admin.yourshop.com.
Both are single-page apps: configure the host to serve index.html for unknown paths
(nginx:  location / { try_files $uri /index.html; }).
Extra safety for the admin domain: restrict by IP or put it behind your host's access control.
