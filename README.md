# CapCrew - caps store (solid caps, smiley caps)

A full online store for caps: React shop, React admin site, Django REST backend, PostgreSQL database.
It was converted from the extension-cord store and is fully separate from it: own database, own ports,
own secret key, own Redis databases, own Docker containers. Both sites can run on the same computer at the same time.

## Ports (so it never clashes with the extension-cord site)

| Part                   | Caps site (this project)        | Original cord site (unchanged) |
|------------------------|---------------------------------|--------------------------------|
| Backend API            | http://localhost:8001           | 8000                           |
| Shop (customers)       | http://localhost:5175           | 5173                           |
| Admin site (you)       | http://localhost:5176           | 5174                           |
| PostgreSQL database    | `capcrew_db` (user `capcrew`)   | `ecommerce_db`                 |
| Redis (local, no docker) | same server, DB numbers 3, 4, 5 | DB numbers 0, 1, 2           |
| Docker: Postgres / Redis (host ports) | 5433 / 6380      | 5432 / 6379                    |

## First-time setup (Windows or Mac/Linux)

0. If `backend\.env` / `frontend\.env` do not exist yet, copy `backend\.env.example` to `backend\.env` and `frontend\.env.example` to `frontend\.env`, then fill in the values. These files hold secrets and are never shared or committed.

1. Create the database (once). In `psql` as a Postgres admin:
   ```sql
   CREATE USER capcrew WITH PASSWORD 'capcrew';
   CREATE DATABASE capcrew_db OWNER capcrew;
   ```
2. Backend:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_data      # 3 categories + 7 demo caps
   python manage.py seed_stock     # gives every cap some stock so it can be bought
   python manage.py runserver 8001
   ```
3. Shop and admin (two more terminals):
   ```bash
   cd frontend
   npm install
   npm run dev            # shop  -> http://localhost:5175
   npm run dev:admin      # admin -> http://localhost:5176
   ```
4. Make yourself the owner (from the `backend` folder, with the venv active):
   ```bash
   python manage.py createsuperuser
   ```
   **Important:** this site signs in with your email address, so type your email at the **Username** prompt as well
   as the Email prompt (both the same, all lowercase). Then sign in at http://localhost:5176 with that email and password.
   If you already created a superuser with a different username, fix it with:
   ```bash
   python manage.py shell -c "from django.contrib.auth.models import User; u=User.objects.filter(is_superuser=True).order_by('-date_joined').first(); u.username=u.email=u.email.lower(); u.save(); print(u.username)"
   ```

Using Docker instead: `docker compose up --build` (containers are named `capcrew-*`).

## What was changed from the extension-cord store

- **Brand**: ElectroFlow -> CapCrew everywhere (shop, admin, emails, invoices, shipping labels, SEO tags, manifest, sitemap).
- **Catalogue**: 3 categories (Solid Caps, Smiley Caps, Snapback & Trucker Caps) and 7 demo caps with colour/size variants, in `backend/catalog/management/commands/seed_data.py`.
- **Product details**: cord fields (voltage, sockets, wattage) replaced with cap fields (material, brim, closure, fit, care).
- **Content**: home, products, about, contact, footer, FAQs rewritten for caps. Invented certifications/awards (ISO, BIS, "Best Retailer") were removed; the About page now shows plain store promises.
- **Returns**: copy says 7-day returns (matches `DEFAULT_RETURN_WINDOW_DAYS=7` in the backend).
- **Theme**: orange instead of blue. Change it in one place: `frontend/tailwind.config.js` (`blue: colors.orange`).
- **Separation**: new database, secret key, ports, Redis DB numbers, Docker names/volumes, SKU and order prefix `CC-`.
- **Fixes carried in**: `terser` added to the frontend (production build failed without it); Django upgraded to 5.2 LTS with refreshed, pinned packages (`backend/requirements.txt` = what the site needs to run, `requirements-dev.txt` = developer tools).

## Website polish (checklist) - what is in place

- **Page titles and descriptions** for every page (`frontend/src/utils/usePageMeta.ts`), including product pages.
- **Favicon, app icons and share image** (`frontend/public/`), also for the admin site.
- **Product page** (`/products/<name>`): photos, colour/size options, stock, quantity, add to cart. Before this, every product link led to the 404 page.
- **No dead links**: social icons in the footer only appear when you fill `VITE_SOCIAL_*` in `frontend/.env`; the dead "Forgot password?" link now points to Contact.
- **Clickable email and phone** on the Contact, Terms and Privacy pages and in the footer. The details come from Admin -> Settings, so change them there.
- **Working contact form**: messages are saved (view them at http://localhost:8001/admin/ under "Contact messages") and emailed to `BUSINESS_EMAIL`. It limits each visitor to 5 messages per hour. Run `python manage.py migrate` after updating.
- **Photo compression**: photos uploaded in the admin are resized (longest side 1600 px) and compressed automatically. Product images load lazily.
- **Mobile**: collapsible filters, the phone menu closes after a tap, invoice table scrolls, and a global guard stops sideways scrolling.
- **Messages**: "added to cart" confirmations, load-error screens with a Try again button, and clear errors on the contact form.
- **Removed invented content**: fake 4.5-star ratings, "50K+ customers" stats, testimonials, fake blog posts, an unconnected newsletter box and made-up business hours.

## Security and going live

**Read `deploy/DEPLOYMENT.md` before putting the site on the internet.** It is a complete step-by-step guide
(server, database, HTTPS, nginx, Razorpay, backups). Do not host it from your own PC or with the development `.env`.

What the site now protects against (all covered by automated tests):

- **Password / code guessing**: login, sign-up and email-code endpoints are rate limited; 5 wrong passwords lock that visitor out for 15 minutes; a code dies after 5 wrong guesses; the Django admin login is limited too.
- **Fake sign-ups**: email codes are random, single-use and never written to logs or shown in replies on a live site; passwords must pass Django's strength rules on the server.
- **Free orders**: the fake test payment gateway is switched off on a live site (the site refuses to start otherwise), and online orders cannot be placed without a real gateway. Razorpay webhook calls are accepted only with a valid signature and the right amount.
- **Seeing other people's data**: customers can only see their own orders; every admin API route refuses visitors and ordinary customers.
- **SQL injection / XSS**: all database access goes through Django's ORM (no raw SQL) and the website never inserts raw HTML into pages.
- **Hardening**: HTTPS redirect + HSTS, secure cookies, a strict Content-Security-Policy, hidden admin address and API docs, no console logging in production builds.
- **Start-up safety checks**: `python manage.py check --deploy` tells you what is misconfigured before customers find out.

## Running the tests

```bash
cd backend && python manage.py test     # ~120 tests
cd frontend && npm test                 # 16 tests
```

## Things to replace before going live

- Logo (the favicon and icons are simple cap drawings you can replace in `frontend/public/`) and product photos (add real photos in Admin -> Products).
- `BUSINESS_*` values, store address, GSTIN, support email and phone (Admin -> Settings, and `backend/.env`).
- Domain placeholders `capcrew.in` in `frontend/index.html` and `frontend/public/sitemap.xml`.
- Payment keys (`PAYMENT_PROVIDER` is `mock`) and email keys. `backend/.env` was copied from the cord site, so create separate Brevo/Razorpay credentials for this store if you want them separate.
- Demo product text is marked "DEMO DATA".
