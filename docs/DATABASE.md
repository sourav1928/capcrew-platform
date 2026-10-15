# Database Schema & Design

## Overview

This document describes the complete database schema for the e-commerce platform. The schema is designed to be:
- **Normalized**: Minimal data duplication, proper relationships
- **Extensible**: Can support future features (B2B, bundles, multiple currencies)
- **Audit-friendly**: Tracks historical data and changes
- **Transaction-safe**: Supports concurrent operations without race conditions

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│                    USER ENTITIES                     │
├─────────────────────────────────────────────────────┤
│
├─ User (extends Django User)
│  ├─ id (PK)
│  ├─ email (unique)
│  ├─ phone (unique, optional)
│  ├─ date_joined
│  ├─ is_active
│  └─ is_staff
│
├─ Profile
│  ├─ id (PK)
│  ├─ user_id (FK)
│  ├─ date_of_birth
│  ├─ gender
│  ├─ preferred_language
│  └─ marketing_consent
│
├─ Address
│  ├─ id (PK)
│  ├─ user_id (FK)
│  ├─ type (billing/shipping/both)
│  ├─ full_name
│  ├─ phone
│  ├─ line1, line2
│  ├─ city, state, postal_code
│  ├─ country
│  ├─ is_default
│  └─ is_deleted
│
├─ Role
│  ├─ id (PK)
│  └─ name (unique)
│
├─ Permission
│  ├─ id (PK)
│  ├─ role_id (FK)
│  └─ permission (unique per role)
│
└─ UserRole
   ├─ user_id (FK)
   ├─ role_id (FK)
   └─ assigned_at

┌─────────────────────────────────────────────────────┐
│                  PRODUCT ENTITIES                    │
├─────────────────────────────────────────────────────┤
│
├─ Category
│  ├─ id (PK)
│  ├─ name (unique)
│  ├─ slug (unique, SEO)
│  ├─ description
│  ├─ parent_id (FK, self, nullable for root)
│  ├─ image_url
│  ├─ is_active
│  ├─ display_order
│  ├─ created_at
│  └─ updated_at
│
├─ Product
│  ├─ id (PK)
│  ├─ category_id (FK)
│  ├─ name
│  ├─ slug (unique, SEO)
│  ├─ description
│  ├─ short_description
│  ├─ brand
│  ├─ manufacturer
│  ├─ country_of_origin
│  ├─ status (draft/active/discontinued)
│  ├─ is_deleted
│  ├─ created_at
│  ├─ updated_at
│  └─ deleted_at
│
├─ ProductVariant
│  ├─ id (PK)
│  ├─ product_id (FK)
│  ├─ name (e.g., "Red - 4 Socket")
│  ├─ sku (unique)
│  ├─ description
│  ├─ is_active
│  ├─ created_at
│  └─ updated_at
│
├─ SKU
│  ├─ id (PK)
│  ├─ variant_id (FK)
│  ├─ sku_code (unique)
│  ├─ barcode (unique, optional)
│  ├─ base_price
│  ├─ mrp (Maximum Retail Price)
│  ├─ cost_price (internal)
│  ├─ status
│  ├─ created_at
│  └─ updated_at
│
├─ ProductAttribute
│  ├─ id (PK)
│  ├─ product_id (FK)
│  ├─ name (e.g., "Voltage", "Current", "Sockets")
│  ├─ value
│  ├─ unit (optional)
│  └─ display_order
│
├─ ProductMedia
│  ├─ id (PK)
│  ├─ product_id (FK)
│  ├─ variant_id (FK, nullable)
│  ├─ type (image/video/pdf/manual/certificate)
│  ├─ file_url
│  ├─ alt_text (for accessibility)
│  ├─ display_order
│  ├─ is_primary
│  └─ created_at
│
└─ ProductCompliance
   ├─ id (PK)
   ├─ product_id (FK)
   ├─ certification_type (BIS/QCO/ISO)
   ├─ certification_number
   ├─ certificate_url
   ├─ valid_from
   ├─ valid_until
   ├─ issuing_body
   └─ notes

┌─────────────────────────────────────────────────────┐
│                INVENTORY ENTITIES                    │
├─────────────────────────────────────────────────────┤
│
├─ Warehouse
│  ├─ id (PK)
│  ├─ name
│  ├─ code (unique)
│  ├─ address
│  ├─ phone
│  ├─ is_active
│  └─ created_at
│
├─ Inventory
│  ├─ id (PK)
│  ├─ sku_id (FK)
│  ├─ warehouse_id (FK)
│  ├─ quantity_on_hand
│  ├─ quantity_reserved
│  ├─ quantity_available (on_hand - reserved)
│  ├─ quantity_damaged
│  ├─ last_counted_at
│  ├─ created_at
│  └─ updated_at
│
├─ InventoryTransaction
│  ├─ id (PK)
│  ├─ inventory_id (FK)
│  ├─ transaction_type (purchase/sale/return/damage/adjustment/transfer)
│  ├─ quantity_change
│  ├─ reference_type (order/return/purchase_order)
│  ├─ reference_id
│  ├─ notes
│  ├─ created_by_id (FK)
│  ├─ created_at
│  └─ updated_at
│
├─ StockReservation
│  ├─ id (PK)
│  ├─ sku_id (FK)
│  ├─ warehouse_id (FK)
│  ├─ cart_item_id (FK, nullable)
│  ├─ order_id (FK, nullable)
│  ├─ quantity
│  ├─ status (reserved/confirmed/released/expired)
│  ├─ expires_at
│  ├─ created_at
│  └─ updated_at

┌─────────────────────────────────────────────────────┐
│                  PRICING ENTITIES                    │
├─────────────────────────────────────────────────────┤
│
├─ TaxClass
│  ├─ id (PK)
│  ├─ name (e.g., "Electrical Components - 5%")
│  ├─ code (unique)
│  ├─ description
│  └─ created_at
│
├─ TaxRate
│  ├─ id (PK)
│  ├─ tax_class_id (FK)
│  ├─ country
│  ├─ state (nullable)
│  ├─ rate_percentage
│  ├─ valid_from
│  ├─ valid_until
│  └─ created_at
│
└─ PriceHistory
   ├─ id (PK)
   ├─ sku_id (FK)
   ├─ old_price
   ├─ new_price
   ├─ reason
   ├─ changed_by_id (FK)
   ├─ changed_at
   └─ is_deleted

┌─────────────────────────────────────────────────────┐
│                   CART ENTITIES                      │
├─────────────────────────────────────────────────────┤
│
├─ Cart
│  ├─ id (PK)
│  ├─ user_id (FK, nullable for guest)
│  ├─ session_id (for guest carts)
│  ├─ total_items
│  ├─ last_activity_at
│  ├─ created_at
│  └─ updated_at
│
└─ CartItem
   ├─ id (PK)
   ├─ cart_id (FK)
   ├─ sku_id (FK)
   ├─ quantity
   ├─ unit_price (snapshot at add time)
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│                 WISHLIST ENTITIES                    │
├─────────────────────────────────────────────────────┤
│
├─ Wishlist
│  ├─ id (PK)
│  ├─ user_id (FK)
│  ├─ created_at
│  └─ updated_at
│
└─ WishlistItem
   ├─ id (PK)
   ├─ wishlist_id (FK)
   ├─ product_id (FK)
   ├─ variant_id (FK, nullable)
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│                   ORDER ENTITIES                     │
├─────────────────────────────────────────────────────┤
│
├─ Order
│  ├─ id (PK)
│  ├─ order_number (unique, human-readable)
│  ├─ user_id (FK, nullable for guest)
│  ├─ status (pending/confirmed/processing/shipped/delivered/cancelled)
│  ├─ payment_status (pending/authorized/paid/failed/refunded)
│  ├─ fulfillment_status (pending/picking/packing/shipped/delivered)
│  ├─ total_items
│  ├─ subtotal
│  ├─ discount_amount
│  ├─ tax_amount
│  ├─ shipping_cost
│  ├─ order_total
│  ├─ billing_address_id (FK)
│  ├─ shipping_address_id (FK)
│  ├─ shipping_method
│  ├─ coupon_id (FK, nullable)
│  ├─ notes
│  ├─ created_at
│  ├─ updated_at
│  └─ confirmed_at
│
├─ OrderItem
│  ├─ id (PK)
│  ├─ order_id (FK)
│  ├─ sku_id (FK)
│  ├─ product_name (snapshot)
│  ├─ variant_name (snapshot)
│  ├─ sku_code (snapshot)
│  ├─ quantity
│  ├─ unit_price (snapshot at order time)
│  ├─ discount_per_item
│  ├─ tax_per_item
│  ├─ line_total
│  ├─ warranty_id (FK, nullable)
│  ├─ created_at
│  └─ updated_at
│
├─ OrderStatusHistory
│  ├─ id (PK)
│  ├─ order_id (FK)
│  ├─ old_status
│  ├─ new_status
│  ├─ reason
│  ├─ changed_by_id (FK)
│  ├─ changed_at
│  └─ notes
│
└─ OrderAddress
   ├─ id (PK)
   ├─ order_id (FK)
   ├─ type (billing/shipping)
   ├─ full_name
   ├─ phone
   ├─ line1, line2
   ├─ city, state, postal_code
   ├─ country
   └─ created_at

┌─────────────────────────────────────────────────────┐
│                PAYMENT ENTITIES                      │
├─────────────────────────────────────────────────────┤
│
├─ Payment
│  ├─ id (PK)
│  ├─ order_id (FK)
│  ├─ payment_method (online/cod)
│  ├─ status (pending/authorized/paid/failed/refunded)
│  ├─ amount
│  ├─ currency
│  ├─ gateway_order_id (Razorpay order ID)
│  ├─ gateway_payment_id (Razorpay payment ID)
│  ├─ idempotency_key (unique)
│  ├─ created_at
│  └─ updated_at
│
├─ PaymentAttempt
│  ├─ id (PK)
│  ├─ payment_id (FK)
│  ├─ attempt_number
│  ├─ status (pending/success/failed)
│  ├─ error_code
│  ├─ error_message
│  ├─ created_at
│  └─ updated_at
│
├─ PaymentTransaction
│  ├─ id (PK)
│  ├─ payment_id (FK)
│  ├─ transaction_type (debit/credit/refund)
│  ├─ amount
│  ├─ gateway_reference_id
│  ├─ response_code
│  ├─ response_message
│  ├─ created_at
│  └─ updated_at
│
├─ WebhookEvent
│  ├─ id (PK)
│  ├─ payment_id (FK, nullable)
│  ├─ event_type (payment.authorized/payment.captured)
│  ├─ raw_data (JSON)
│  ├─ signature (for verification)
│  ├─ is_processed
│  ├─ processing_error
│  ├─ created_at
│  └─ processed_at
│
└─ Refund
   ├─ id (PK)
   ├─ payment_id (FK)
   ├─ order_id (FK)
   ├─ amount
   ├─ reason (payment_error/customer_request/return_refund)
   ├─ status (pending/processing/completed/failed)
   ├─ gateway_refund_id
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│               SHIPPING ENTITIES                      │
├─────────────────────────────────────────────────────┤
│
├─ Shipment
│  ├─ id (PK)
│  ├─ order_id (FK)
│  ├─ tracking_number (unique)
│  ├─ courier_provider
│  ├─ status (created/picked_up/in_transit/out_for_delivery/delivered/ndr/rto)
│  ├─ estimated_delivery
│  ├─ actual_delivery
│  ├─ shipped_at
│  ├─ created_at
│  └─ updated_at
│
└─ ShipmentTrackingEvent
   ├─ id (PK)
   ├─ shipment_id (FK)
   ├─ status
   ├─ location
   ├─ event_date
   ├─ notes
   └─ created_at

┌─────────────────────────────────────────────────────┐
│              RETURN & REFUND ENTITIES                │
├─────────────────────────────────────────────────────┤
│
├─ Return
│  ├─ id (PK)
│  ├─ return_number (unique)
│  ├─ order_id (FK)
│  ├─ status (requested/approved/rejected/picked_up/received/inspecting/completed)
│  ├─ reason
│  ├─ description
│  ├─ refund_amount
│  ├─ requested_at
│  ├─ approved_at
│  ├─ completed_at
│  ├─ created_at
│  └─ updated_at
│
├─ ReturnItem
│  ├─ id (PK)
│  ├─ return_id (FK)
│  ├─ order_item_id (FK)
│  ├─ quantity
│  ├─ refund_amount
│  ├─ inspection_status (pending/approved/rejected)
│  └─ notes
│
└─ ReturnAddress
   ├─ id (PK)
   ├─ return_id (FK)
   ├─ address
   ├─ city, state, postal_code
   ├─ country
   └─ phone

┌─────────────────────────────────────────────────────┐
│               WARRANTY ENTITIES                      │
├─────────────────────────────────────────────────────┤
│
├─ Warranty
│  ├─ id (PK)
│  ├─ order_item_id (FK)
│  ├─ warranty_type (manufacturer/extended)
│  ├─ coverage_start
│  ├─ coverage_end
│  ├─ coverage_description
│  ├─ is_active
│  └─ created_at
│
├─ WarrantyClaim
│  ├─ id (PK)
│  ├─ claim_number (unique)
│  ├─ warranty_id (FK)
│  ├─ status (submitted/under_review/approved/rejected/completed)
│  ├─ issue_description
│  ├─ claim_date
│  ├─ resolution_type (repair/replacement/refund)
│  ├─ resolved_at
│  ├─ notes
│  ├─ created_at
│  └─ updated_at
│
└─ WarrantyAttachment
   ├─ id (PK)
   ├─ warranty_claim_id (FK)
   ├─ file_url
   ├─ file_type
   └─ created_at

┌─────────────────────────────────────────────────────┐
│                 REVIEW ENTITIES                      │
├─────────────────────────────────────────────────────┤
│
├─ Review
│  ├─ id (PK)
│  ├─ order_item_id (FK)
│  ├─ product_id (FK)
│  ├─ user_id (FK)
│  ├─ rating (1-5)
│  ├─ title
│  ├─ content
│  ├─ is_verified_purchase
│  ├─ is_approved
│  ├─ helpful_count
│  ├─ unhelpful_count
│  ├─ created_at
│  ├─ updated_at
│  └─ deleted_at
│
├─ ReviewImage
│  ├─ id (PK)
│  ├─ review_id (FK)
│  ├─ image_url
│  └─ created_at
│
├─ ReviewReport
│  ├─ id (PK)
│  ├─ review_id (FK)
│  ├─ reported_by_id (FK)
│  ├─ reason
│  ├─ status (reported/investigating/resolved)
│  └─ created_at
│
└─ ReviewResponse
   ├─ id (PK)
   ├─ review_id (FK)
   ├─ responded_by_id (FK)
   ├─ response_text
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│             COUPON & PROMOTION ENTITIES              │
├─────────────────────────────────────────────────────┤
│
├─ Coupon
│  ├─ id (PK)
│  ├─ code (unique)
│  ├─ description
│  ├─ discount_type (fixed/percentage)
│  ├─ discount_value
│  ├─ max_discount_amount
│  ├─ min_order_value
│  ├─ max_usage_limit
│  ├─ usage_per_user_limit
│  ├─ is_first_order_only
│  ├─ is_active
│  ├─ valid_from
│  ├─ valid_until
│  ├─ created_at
│  └─ updated_at
│
├─ CouponUsage
│  ├─ id (PK)
│  ├─ coupon_id (FK)
│  ├─ user_id (FK)
│  ├─ order_id (FK)
│  ├─ discount_amount
│  ├─ used_at
│  └─ created_at
│
├─ CouponRestriction
│  ├─ id (PK)
│  ├─ coupon_id (FK)
│  ├─ restriction_type (category/product)
│  ├─ category_id (FK, nullable)
│  ├─ product_id (FK, nullable)
│  └─ created_at
│
├─ Promotion
│  ├─ id (PK)
│  ├─ name
│  ├─ description
│  ├─ promotion_type (product_discount/category_discount/buy_x_get_y/free_shipping)
│  ├─ discount_type (fixed/percentage)
│  ├─ discount_value
│  ├─ is_active
│  ├─ valid_from
│  ├─ valid_until
│  ├─ priority
│  ├─ created_at
│  └─ updated_at
│
└─ PromotionRule
   ├─ id (PK)
   ├─ promotion_id (FK)
   ├─ min_quantity
   ├─ max_quantity
   ├─ min_order_value
   ├─ applicable_categories (JSON array)
   ├─ applicable_products (JSON array)
   └─ created_at

┌─────────────────────────────────────────────────────┐
│              SUPPORT & TICKET ENTITIES               │
├─────────────────────────────────────────────────────┤
│
├─ SupportTicket
│  ├─ id (PK)
│  ├─ ticket_number (unique)
│  ├─ user_id (FK)
│  ├─ category (general/order/product/payment)
│  ├─ priority (low/medium/high/urgent)
│  ├─ status (open/in_progress/waiting_customer/resolved/closed)
│  ├─ subject
│  ├─ description
│  ├─ assigned_to_id (FK, nullable)
│  ├─ created_at
│  ├─ updated_at
│  ├─ resolved_at
│  └─ closed_at
│
├─ SupportMessage
│  ├─ id (PK)
│  ├─ ticket_id (FK)
│  ├─ sender_id (FK)
│  ├─ sender_type (customer/agent)
│  ├─ message
│  ├─ is_internal (for agent notes)
│  ├─ created_at
│  └─ updated_at
│
├─ SupportAttachment
│  ├─ id (PK)
│  ├─ message_id (FK)
│  ├─ file_url
│  ├─ file_type
│  └─ created_at
│
└─ SupportResponse (Template)
   ├─ id (PK)
   ├─ name
   ├─ category
   ├─ template_text
   └─ created_at

┌─────────────────────────────────────────────────────┐
│              NOTIFICATIONS & CMS ENTITIES            │
├─────────────────────────────────────────────────────┤
│
├─ Notification
│  ├─ id (PK)
│  ├─ user_id (FK)
│  ├─ notification_type (order/payment/shipment/return)
│  ├─ title
│  ├─ message
│  ├─ reference_type (order/shipment)
│  ├─ reference_id
│  ├─ is_read
│  ├─ created_at
│  └─ read_at
│
├─ CMSPage
│  ├─ id (PK)
│  ├─ slug (unique)
│  ├─ title
│  ├─ content (rich HTML)
│  ├─ meta_description
│  ├─ is_published
│  ├─ created_at
│  └─ updated_at
│
├─ CMSBanner
│  ├─ id (PK)
│  ├─ title
│  ├─ subtitle
│  ├─ image_url
│  ├─ link_url
│  ├─ is_active
│  ├─ display_order
│  ├─ valid_from
│  ├─ valid_until
│  ├─ created_at
│  └─ updated_at
│
├─ CMSFAQ
│  ├─ id (PK)
│  ├─ question
│  ├─ answer
│  ├─ category
│  ├─ display_order
│  ├─ is_published
│  ├─ created_at
│  └─ updated_at
│
└─ CMSContent
   ├─ id (PK)
   ├─ key (unique identifier)
   ├─ content (JSON or text)
   ├─ content_type
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│           ANALYTICS & AUDIT ENTITIES                │
├─────────────────────────────────────────────────────┤
│
├─ AnalyticsEvent
│  ├─ id (PK)
│  ├─ user_id (FK, nullable for anonymous)
│  ├─ event_type (page_view/add_to_cart/checkout_started/purchase)
│  ├─ event_data (JSON)
│  ├─ page_url
│  ├─ referrer
│  ├─ user_agent
│  ├─ ip_address
│  ├─ created_at
│  └─ updated_at
│
├─ AuditLog
│  ├─ id (PK)
│  ├─ user_id (FK)
│  ├─ action (create/update/delete)
│  ├─ entity_type (Product/Order/etc)
│  ├─ entity_id
│  ├─ old_values (JSON, nullable)
│  ├─ new_values (JSON)
│  ├─ ip_address
│  ├─ user_agent
│  ├─ created_at
│  └─ updated_at
│
└─ FraudFlag
   ├─ id (PK)
   ├─ user_id (FK, nullable)
   ├─ order_id (FK, nullable)
   ├─ flag_type (high_value_order/frequent_failures/suspicious_pattern)
   ├─ severity (low/medium/high)
   ├─ reason
   ├─ is_resolved
   ├─ resolved_at
   ├─ created_at
   └─ updated_at

┌─────────────────────────────────────────────────────┐
│         SUPPLIER & PROCUREMENT ENTITIES (Future)    │
├─────────────────────────────────────────────────────┤
│
├─ Supplier
│  ├─ id (PK)
│  ├─ name
│  ├─ code (unique)
│  ├─ email
│  ├─ phone
│  ├─ address
│  ├─ is_active
│  └─ created_at
│
├─ PurchaseOrder
│  ├─ id (PK)
│  ├─ po_number (unique)
│  ├─ supplier_id (FK)
│  ├─ status (draft/sent/confirmed/received/invoiced)
│  ├─ total_amount
│  ├─ ordered_at
│  ├─ expected_delivery
│  ├─ actual_delivery
│  ├─ created_at
│  └─ updated_at
│
├─ PurchaseOrderItem
│  ├─ id (PK)
│  ├─ po_id (FK)
│  ├─ sku_id (FK)
│  ├─ quantity
│  ├─ unit_price
│  ├─ received_quantity
│  └─ created_at
│
└─ GoodsReceipt
   ├─ id (PK)
   ├─ po_id (FK)
   ├─ receipt_number (unique)
   ├─ warehouse_id (FK)
   ├─ received_at
   ├─ received_by_id (FK)
   ├─ notes
   └─ created_at
```

## Key Design Decisions

### 1. Soft Deletes
- Products, orders, etc. use soft deletes (is_deleted flag)
- Preserves historical data for auditing
- Prevents cascade deletion accidents

### 2. Order Snapshots
- OrderItem stores product name, variant, price at order time
- Protects against product changes affecting historical orders
- Maintains accurate invoicing

### 3. Stock Reservation
- Separate StockReservation table for cart items
- 15-minute expiry for unreserved items
- Atomic operations prevent overselling

### 4. Payment Idempotency
- Idempotency key ensures duplicate requests are handled safely
- Webhook processing is idempotent
- Payment status never goes backwards

### 5. Address Snapshots
- OrderAddress captures billing/shipping at order time
- Customer can update their address without affecting past orders

### 6. Tax Flexibility
- TaxRate table allows historical tax rate tracking
- Supports multiple tax rates per region
- Extensible for multiple countries

### 7. Audit Trail
- AuditLog captures all sensitive changes
- Tracks user, old values, new values
- IP address and timestamp

## Indexes

Critical indexes for performance:

```sql
-- User & Authentication
CREATE INDEX idx_user_email ON auth_user(email);
CREATE INDEX idx_user_phone ON accounts_profile(phone);

-- Product Search
CREATE INDEX idx_product_slug ON catalog_product(slug);
CREATE INDEX idx_product_category ON catalog_product(category_id);
CREATE INDEX idx_product_status ON catalog_product(status) WHERE NOT is_deleted;
CREATE INDEX idx_variant_sku ON catalog_productvariant(sku);
CREATE INDEX idx_sku_code ON catalog_sku(sku_code);

-- Inventory
CREATE INDEX idx_inventory_sku ON inventory_inventory(sku_id);
CREATE INDEX idx_inventory_warehouse ON inventory_inventory(warehouse_id);
CREATE INDEX idx_stock_reservation_sku ON inventory_stockreservation(sku_id);
CREATE INDEX idx_stock_reservation_status ON inventory_stockreservation(status);
CREATE INDEX idx_stock_reservation_expires ON inventory_stockreservation(expires_at);

-- Orders
CREATE INDEX idx_order_user ON orders_order(user_id);
CREATE INDEX idx_order_number ON orders_order(order_number);
CREATE INDEX idx_order_status ON orders_order(status);
CREATE INDEX idx_order_created ON orders_order(created_at);
CREATE INDEX idx_order_item_order ON orders_orderitem(order_id);
CREATE INDEX idx_order_item_sku ON orders_orderitem(sku_id);

-- Payments
CREATE INDEX idx_payment_order ON payments_payment(order_id);
CREATE INDEX idx_payment_status ON payments_payment(status);
CREATE INDEX idx_payment_gateway ON payments_payment(gateway_order_id);
CREATE INDEX idx_payment_idempotency ON payments_payment(idempotency_key);

-- Cart
CREATE INDEX idx_cart_user ON cart_cart(user_id);
CREATE INDEX idx_cart_item_cart ON cart_cartitem(cart_id);

-- Returns & Refunds
CREATE INDEX idx_return_order ON returns_return(order_id);
CREATE INDEX idx_return_number ON returns_return(return_number);
CREATE INDEX idx_refund_payment ON refunds_refund(payment_id);
CREATE INDEX idx_refund_order ON refunds_refund(order_id);

-- Reviews
CREATE INDEX idx_review_product ON reviews_review(product_id);
CREATE INDEX idx_review_user ON reviews_review(user_id);
CREATE INDEX idx_review_approved ON reviews_review(is_approved) WHERE NOT is_deleted;

-- Coupons
CREATE INDEX idx_coupon_code ON coupons_coupon(code);
CREATE INDEX idx_coupon_active ON coupons_coupon(is_active);
CREATE INDEX idx_coupon_usage_user ON coupons_couponusage(user_id);

-- Shipping
CREATE INDEX idx_shipment_order ON shipping_shipment(order_id);
CREATE INDEX idx_shipment_tracking ON shipping_shipment(tracking_number);

-- Support
CREATE INDEX idx_ticket_user ON support_supportticket(user_id);
CREATE INDEX idx_ticket_status ON support_supportticket(status);
CREATE INDEX idx_ticket_number ON support_supportticket(ticket_number);

-- Analytics & Audit
CREATE INDEX idx_analytics_user ON analytics_analyticsevent(user_id);
CREATE INDEX idx_analytics_type ON analytics_analyticsevent(event_type);
CREATE INDEX idx_audit_user ON core_auditlog(user_id);
CREATE INDEX idx_audit_entity ON core_auditlog(entity_type, entity_id);
```

## Constraints & Validation

### Unique Constraints
- User: email, phone
- Product: slug per category
- SKU: sku_code, barcode
- Order: order_number
- Payment: idempotency_key
- Coupon: code
- Shipment: tracking_number
- Support Ticket: ticket_number
- PurchaseOrder: po_number

### Foreign Key Constraints
- All foreign keys with CASCADE or RESTRICT as appropriate
- ON DELETE RESTRICT for products (historical reference)
- ON DELETE CASCADE for cart items, order items (cleanup)

### Domain Constraints
- Stock quantity >= 0
- Order total >= 0
- Rating between 1-5
- Tax rates >= 0
- Discount amounts >= 0

---

For migration creation and model implementation, see Phase 2 implementation tasks.
