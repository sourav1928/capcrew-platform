# Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      End User                                │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      CDN / Cloudflare                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│         React Frontend (Vite)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Pages | Components | Services | State Management    │   │
│  │ TanStack Query | Redux Toolkit | React Router        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTPS / REST API
                             │
┌────────────────────────────▼────────────────────────────────┐
│         Django REST API Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ accounts | catalog | orders | payments | etc        │   │
│  │ Authentication | Authorization | Business Logic      │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐ ┌──────────▼────────┐ ┌───────▼────────┐
│   PostgreSQL   │ │      Redis        │ │    Celery      │
│   Database     │ │    Cache/Queue    │ │   Workers      │
└────────────────┘ └───────────────────┘ └────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐   ┌──────────▼────────┐  ┌──────▼──────┐
   │ S3/Media  │   │ Payment Gateway   │  │ Shipping    │
   │ Storage   │   │ (Razorpay)        │  │ Providers   │
   └───────────┘   └───────────────────┘  └─────────────┘
```

## Architectural Principles

### 1. Modular Monolith
- Single Django application split into domain-oriented apps
- Clear separation of concerns
- Easy to extract services later if needed
- No premature microservices

### 2. API-First Design
- RESTful API with versioning (`/api/v1/`)
- OpenAPI/Swagger documentation
- Clear request/response contracts
- Stable API versions

### 3. State Management
- **Server State**: TanStack Query (frontend) + Django ORM (backend)
- **Client State**: Redux Toolkit (UI state, preferences)
- No unnecessary client-side caching of server data

### 4. Security First
- Server-side validation for all inputs
- JWT + Session authentication
- RBAC (Role-Based Access Control)
- Audit logging for sensitive operations
- HTTPS enforced
- Secure headers

### 5. Database Transactions
- Critical operations use database transactions
- Stock reservation with atomic operations
- No race conditions during concurrent checkout
- Idempotency for payment operations

## Domain-Oriented Apps Structure

### Core App
Shared utilities, base models, middleware, pagination.

### Accounts App
- User authentication (registration, login, logout)
- Password management
- User profiles
- Role-based access control
- Address management

### Catalog App
- Products, categories, subcategories
- Product variants (cable length, number of sockets, etc.)
- SKUs
- Product attributes
- Product media (images, PDFs, videos)
- Product specifications
- Compliance information

### Inventory App
- Warehouse management
- Stock levels
- Inventory transactions
- Stock reservations
- Low-stock alerts

### Cart App
- Guest/authenticated cart
- Cart items
- Cart calculations (prices, taxes, shipping)
- Coupon application

### Wishlist App
- Wishlist items
- Stock status tracking
- Move to cart functionality

### Checkout App
- Checkout flow orchestration
- Customer details validation
- Address selection/creation
- Shipping method selection
- Payment method selection
- Final validation before order creation

### Orders App
- Order creation
- Order items with snapshots
- Order status management
- Order history
- Order details

### Payments App
- Payment processing abstraction
- Multiple payment providers (Razorpay, mock)
- Payment attempts tracking
- Payment transactions
- Webhook handling
- Idempotency

### Shipping App
- Shipping provider abstraction
- Shipment creation and tracking
- Tracking events
- Delivery/NDR/RTO status

### Returns App
- Return requests
- Return approvals/rejections
- Return pickup
- Return inspection

### Refunds App
- Refund processing
- Refund transactions
- Refund status tracking
- Retry logic for failed refunds

### Warranty App
- Warranty periods
- Warranty claims
- Claim status tracking

### Reviews App
- Product reviews
- Ratings
- Moderation
- Review analytics

### Coupons App
- Coupon creation/management
- Coupon validation
- Usage tracking
- Expiry management

### Promotions App
- Campaign management
- Promotion rules
- Discount calculations
- Promotion analytics

### Tax App
- Tax classes
- Tax rates
- Tax calculations
- GST compliance

### Invoicing App
- Invoice generation
- Invoice PDFs
- Invoice numbering
- Statutory requirements

### CMS App
- Homepage content
- Banners
- FAQs
- Policy pages
- Content management

### Support App
- Support tickets
- Messages
- Attachments
- Internal notes
- Ticket assignment

### Notifications App
- Email notifications
- SMS notifications
- Push notifications
- In-app notifications
- Notification templates

### Analytics App
- Event tracking
- User funnel
- Conversion tracking
- Revenue analytics
- Product performance

### Compliance App
- BIS certification
- Regulatory compliance
- Product compliance documentation

## Data Flow Examples

### Product Purchase Flow
```
User Browse
    ↓
Add to Cart → Cart Service → Stock Reservation
    ↓
Checkout
    ↓
Payment Processing → Payment Provider
    ↓
Order Creation → Inventory Deduction
    ↓
Notification (Email/SMS)
    ↓
Shipping Integration
    ↓
Delivery
    ↓
Post-Purchase (Review, Warranty, Returns)
```

### Payment Processing Flow
```
Checkout Submit
    ↓
Create Payment Intent (Internal)
    ↓
Create Gateway Order (Razorpay)
    ↓
Customer Payment
    ↓
Gateway Callback
    ↓
Verify Payment (Server-side)
    ↓
Webhook Processing (Idempotent)
    ↓
Update Order Status
    ↓
Trigger Fulfillment
```

### Inventory Management Flow
```
Stock Reservation (Add to Cart)
    ↓
Reservation Expiry Timer (15 mins)
    ↓
Order Creation
    ↓
Stock Deduction (Atomic)
    ↓
Return/Refund
    ↓
Stock Reversal
```

## API Endpoint Organization

```
/api/v1/
├── auth/                    # Authentication endpoints
├── products/                # Product catalog
├── categories/              # Category management
├── cart/                    # Shopping cart
├── wishlist/                # Wishlists
├── checkout/                # Checkout process
├── orders/                  # Orders
├── payments/                # Payments
├── shipping/                # Shipping
├── returns/                 # Returns
├── refunds/                 # Refunds
├── reviews/                 # Reviews
├── coupons/                 # Coupons
├── invoices/                # Invoices
├── support/                 # Support tickets
└── admin/                   # Admin operations
```

## Technology Decisions

### Why Modular Monolith?
- Simpler deployment than microservices
- Easier to share database transactions
- Simpler to coordinate between services
- Can be split into microservices later

### Why PostgreSQL?
- ACID transactions
- JSON support for flexible data
- Full-text search
- PostGIS for location data (future)
- Proven reliability

### Why Redis?
- Caching for database queries
- Session storage
- Message queue for Celery
- Rate limiting
- Real-time operations

### Why Celery?
- Asynchronous task processing
- Scheduled tasks (Celery Beat)
- Retry logic
- Task monitoring

### Why TanStack Query?
- Automatic caching
- Background synchronization
- Reduces Redux boilerplate
- Better server state management

### Why Redux Toolkit?
- Client-side state (UI, preferences)
- Smaller footprint for true client state
- Not overused for server state

## Security Architecture

### Authentication
- JWT tokens for API
- Session cookies for web
- Token refresh mechanism
- HTTPS in production

### Authorization
- RBAC (Role-Based Access Control)
- Permission checks at API level
- Object-level permissions where needed
- Admin endpoint protection

### Data Protection
- Passwords hashed with PBKDF2
- Sensitive data never logged
- PII handled carefully
- GDPR compliance ready

### API Security
- Rate limiting
- CORS properly configured
- CSRF tokens
- SQL injection prevention (ORM)
- XSS prevention

## Scaling Considerations

### Current (Monolith)
- Single backend instance
- PostgreSQL primary
- Redis for caching

### Future (When Needed)
- Horizontal scaling with load balancer
- Read replicas for PostgreSQL
- Celery worker pool
- Extract high-load services:
  - Image processing
  - Heavy analytics
  - Real-time notifications

## Monitoring & Observability

- Structured logging (JSON)
- Request IDs for tracing
- Sentry for error tracking
- Database query monitoring
- API performance metrics

---

For detailed database schema, see [DATABASE.md](./DATABASE.md).
For API details, see [API.md](./API.md).
