# CapCrew update: photos, invoices, tracking, editable homepage
(Also contains the previous "separate admin site + store settings" update, so it is safe to apply on top of either version.)

## After installing
1. Backend (venv active):  python manage.py migrate     (adds invoice details, banner button text, tracking link)
2. Start: backend, `npm run dev` (shop :5173), `npm run dev:admin` (admin :5174)
3. Admin -> Settings: fill "Business details" (name, GSTIN, your state) so invoices are correct.

## New in the admin site (http://localhost:5174)
- Products: upload up to 8 photos from your computer; first photo is the main one.
- Orders: "Mark as shipped" asks for courier + tracking number (customer sees it and a Track button).
  "Print invoice" opens a GST invoice (CGST+SGST or IGST) you can print or save as PDF.
- Website: homepage banners (with schedule), featured products, and your own About / Privacy / Terms pages.
- Settings: business details for invoices.

## New in the shop (http://localhost:5173)
- Homepage banner slider + "Featured Products" row (only when you add them in the admin).
- My Orders -> order -> "Track my parcel" and "View / print invoice".

## Uploaded photos
Local development stores them in backend/media/. In production use S3 (set USE_S3=True in .env) or make your
web server serve the /media/ folder.
