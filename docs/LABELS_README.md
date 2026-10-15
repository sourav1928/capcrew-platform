# Shipping labels + invoices (print-ready, like a marketplace seller panel)

## Daily workflow
1. Admin site -> Orders. Tick the orders you are packing today.
2. Click "Print shipping labels" (stick on the outside of each parcel) and "Print invoices" (put one inside each parcel).
3. When you hand the parcel to the courier, open the order -> "Mark as shipped" -> choose the courier and type
   the tracking number. Print the label again if you want the courier's tracking barcode on it.

## Label paper
- Label printer (4 x 6 inch, 100 x 150 mm): one label per page.
- Normal A4 printer: 4 labels per sheet (A6 size) with dashed cut lines.
  In the print window set Scale = 100% (not "Fit to page") and Margins = None.

## What is on the label
Courier name, big COD amount to collect (or PREPAID), scannable Code 128 barcode (the courier tracking number,
or your order number until you have one), customer name/address/PIN/phone, order number and date,
contents and weight, and your return address with GSTIN.
Set your business name, address and GSTIN in Admin -> Settings -> Business details.

## No migration needed for this update.
