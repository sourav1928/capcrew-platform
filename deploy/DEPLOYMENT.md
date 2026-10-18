# Putting CapCrew on the internet

This is the checklist for a normal Linux server (a VPS from DigitalOcean, Hetzner, AWS Lightsail, etc. running
Ubuntu 22.04 or 24.04). Replace `yourshop.com` with your real domain everywhere.

You will run three web addresses from one server:

| Address | What it is | Served by |
|---|---|---|
| `https://yourshop.com` | the shop customers use | nginx (static files) |
| `https://admin.yourshop.com` | your admin site | nginx (static files) |
| `https://api.yourshop.com` | the backend API | gunicorn behind nginx |

**Never run the live site with `DEBUG=True`, with the development `.env`, or on your own Windows PC.**

---

## 1. Before you start

- A domain, and DNS "A" records for `yourshop.com`, `www`, `admin` and `api` all pointing at the server's IP address.
- A Razorpay **live** account (KYC done) if you want online payments. Without it the site still works with Cash on Delivery.
- A Brevo account and an API key made for this store (sign-up codes and order emails are sent through it).
- Server packages: `sudo apt install -y python3-venv python3-dev build-essential libpq-dev postgresql redis-server nginx certbot git`
  and Node.js 20 or newer for building the websites (you can also build them on your own PC and upload the output).

## 2. Database

```bash
sudo -u postgres psql
CREATE USER capcrew WITH PASSWORD 'a-long-random-password-here';
CREATE DATABASE capcrew_db OWNER capcrew;
\q
```

Use a strong password (not `capcrew`). Postgres must listen on `localhost` only (the default).

## 3. Put the code on the server

```bash
sudo adduser --system --group --home /srv/capcrew capcrew
sudo mkdir -p /srv/capcrew && sudo chown capcrew:capcrew /srv/capcrew
# upload the project into /srv/capcrew (git clone, or copy the zip and unzip it there)
# so that you have /srv/capcrew/backend, /srv/capcrew/frontend and /srv/capcrew/deploy
```

Do **not** upload your PC's `backend/.env`, `venv` or `node_modules`.

## 4. Backend

```bash
cd /srv/capcrew/backend
sudo -u capcrew python3 -m venv venv
sudo -u capcrew venv/bin/pip install -r requirements.txt

sudo -u capcrew cp .env.production.example .env
sudo -u capcrew chmod 600 .env
sudo -u capcrew nano .env        # fill in EVERY value (read the comments in the file)
```

Make a secret key with: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`.

Then:

```bash
sudo -u capcrew venv/bin/python manage.py check --deploy   # should list only 2 optional HSTS notes
sudo -u capcrew venv/bin/python manage.py migrate
sudo -u capcrew venv/bin/python manage.py collectstatic --noinput
sudo -u capcrew venv/bin/python manage.py createsuperuser
```

At `createsuperuser`, type **your email address as the Username too** (the shop and admin log in with email).

`check --deploy` is your safety net. The site **refuses to start** if you leave on fake payments, if `DEBUG` is on
in production mode, or if the secret key is weak, and it warns if you forgot the admin address, host names or
the Razorpay webhook secret.

Install the service so it starts on boot:

```bash
sudo cp /srv/capcrew/deploy/capcrew-backend.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now capcrew-backend
sudo systemctl status capcrew-backend        # should say "active (running)"
```

## 5. The shop and the admin website

```bash
cd /srv/capcrew/frontend
cp .env.production.example .env.production && nano .env.production   # set your real API address
npm ci
npm run build            # the shop        -> frontend/dist
npm run build:admin      # the admin site  -> frontend/dist-admin

sudo mkdir -p /var/www/capcrew/shop /var/www/capcrew/admin
sudo cp -r dist/.       /var/www/capcrew/shop/
sudo cp -r dist-admin/. /var/www/capcrew/admin/
```

Every time you change the website you repeat the `npm run build` + copy steps.

## 6. nginx and HTTPS

```bash
sudo cp /srv/capcrew/deploy/nginx-security-headers.conf /etc/nginx/snippets/capcrew-security-headers.conf
sudo cp /srv/capcrew/deploy/nginx-proxy.conf            /etc/nginx/snippets/capcrew-proxy.conf
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yourshop.com -d www.yourshop.com -d admin.yourshop.com -d api.yourshop.com
sudo cp /srv/capcrew/deploy/nginx.conf.example /etc/nginx/sites-available/capcrew
sudo nano /etc/nginx/sites-available/capcrew      # replace yourshop.com; uncomment the admin IP lock (strongly recommended)
sudo ln -s /etc/nginx/sites-available/capcrew /etc/nginx/sites-enabled/capcrew
sudo nginx -t && sudo systemctl start nginx
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

Certificates renew automatically. Check with `sudo certbot renew --dry-run`.

## 7. Recurring jobs

Online orders that are never paid must be cancelled so their stock goes back on sale. Add this to
`/etc/cron.d/capcrew`:

```
*/10 * * * * capcrew cd /srv/capcrew/backend && venv/bin/python manage.py expire_unpaid_orders >> /srv/capcrew/logs/expire.log 2>&1
```

Back up the database every night (and copy the file somewhere off the server):

```
30 2 * * * postgres pg_dump capcrew_db | gzip > /var/backups/capcrew-$(date +\%F).sql.gz
```

Also back up `/srv/capcrew/media` (product photos) and your `backend/.env`.

## Product photos on hosts that erase their disk (Render, Heroku...)

If you host on a normal server (VPS) with a permanent disk, skip this. On Render's free and most other managed plans,
files saved to the server's disk **disappear on every restart**, so photos must be stored elsewhere. Supabase Storage
works well, and you may already have a Supabase project for the database.

1. Supabase -> **Storage** -> **New bucket**. Name it `media` and switch **Public bucket** ON.
2. Supabase -> **Project Settings** -> **Storage** -> **S3 Connection**. Copy the **Endpoint** and the **Region**,
   then click **New access key** and copy the **Access key ID** and the **Secret** (it is shown only once).
3. Find your project reference (Project Settings -> General -> Reference ID; it is also the part after `postgres.` in the database user name).
4. On Render (backend service -> Environment) add:

   | Variable | Value |
   |---|---|
   | `USE_S3` | `True` |
   | `AWS_STORAGE_BUCKET_NAME` | `media` |
   | `AWS_S3_ENDPOINT_URL` | the Endpoint from step 2 |
   | `AWS_S3_REGION_NAME` | the Region from step 2 |
   | `AWS_ACCESS_KEY_ID` | the Access key ID |
   | `AWS_SECRET_ACCESS_KEY` | the Secret |
   | `AWS_S3_CUSTOM_DOMAIN` | `<project-ref>.supabase.co/storage/v1/object/public/media` (no `https://`) |

5. Redeploy, then upload a product photo in the admin. Photos uploaded **before** this change are gone and must be uploaded again.
6. Test: open the photo's address in a new browser tab. It must show the image, not an error.

Other S3-compatible services (Cloudflare R2, Amazon S3, Backblaze B2) use the same variables.

## 8. Razorpay (online payments)

1. Put the **live** key id and secret in `backend/.env` and keep `PAYMENT_PROVIDER=razorpay`.
2. Razorpay Dashboard -> Settings -> Webhooks -> Add new webhook:
   URL `https://api.yourshop.com/api/v1/payments/webhook/razorpay/`, event **payment.captured**, and a secret you choose.
   Put the same secret in `RAZORPAY_WEBHOOK_SECRET`, then `sudo systemctl restart capcrew-backend`.
   The webhook confirms the order even if the customer closes the browser right after paying.
3. Make one small real payment yourself and check the order shows as paid.

## 9. Test it like a customer, then like an attacker

- Register a new account (you must receive the email code), log in, place a **Cash on Delivery** order and an **online** order.
- Send a message from the Contact page and read it at `https://api.yourshop.com/<your admin address>/` under "Contact messages".
- Log in to `https://admin.yourshop.com`.
- In a terminal: `curl -I https://yourshop.com` should show `Strict-Transport-Security` and `Content-Security-Policy`.
- `http://yourshop.com` must redirect to https. `https://api.yourshop.com/admin/` and `/api/v1/docs/` must both say "Not Found".
- Press the login button with a wrong password six times: you should be told to wait 15 minutes.

## 10. Keeping it safe afterwards

- Update the server weekly (`sudo apt update && sudo apt upgrade`) and turn on automatic security updates.
- Every few months update the packages in `backend/requirements.txt` (security fixes) and run `python manage.py test`.
- Use SSH keys instead of passwords for the server, and two-step login on your hosting and domain accounts.
- Use a long unique password for the admin account. Create separate staff accounts for staff; never share one login.
- Add a Sentry account and put its address in `SENTRY_DSN` so you hear about errors before customers do.
- If a secret ever leaks (the `.env` file, a Razorpay or Brevo key), replace it immediately in that service's dashboard.

## What this setup does not do (be aware)

- The login token is kept in the browser's `localStorage`. That is common, but it means a future script-injection bug would
  be more serious. The strict Content-Security-Policy in the nginx file is the main defence; do not loosen it casually.
- The sign-up form tells a visitor whether an email is already registered (a usability trade-off). It is rate limited.
- The admin login is single-step. Use the admin IP restriction in nginx and a strong password.
- The Privacy Policy and Terms pages are templates. Have them reviewed for your business before launch.
- This is not a substitute for a professional security test before you handle large volumes of real payments.
