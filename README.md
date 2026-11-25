# Elettro Engineering Enterprises System

Elettro is a web-based electrical engineering service, booking, inventory, sales, and project-management system. It supports clients, administrators, technicians, warehouse staff, sales staff, and delivery riders.

The repository also contains the Android staff-login application under [`android-app/`](C:/Users/danie/AndroidStudioProjects/elettro/android-app/). The web application is the main system described below.

## Technology

- Next.js 16 App Router pages with Pages Router API endpoints
- React 19 and TypeScript
- Tailwind CSS
- Prisma ORM with PostgreSQL/Neon
- JWT authentication stored in secure cookies
- Gmail SMTP for email notifications and recovery codes
- TextBee Android gateway for SMS notifications
- Cloudinary for optional booking and inventory images

## User roles

### Client

Clients can register with first, middle, and last name fields; verify their email; recover passwords with emailed one-time codes; browse services and products; submit service bookings; monitor booking status; submit feedback; place product orders; and use the floating **Chat with AI Support** assistant.

Service bookings support Mindanao-only province, city/municipality, and barangay selectors, a complete project address, schedule, building type, selected offerings, generated project questions, descriptions, and optional photos. Each offering has a peso price and the client sees a partial estimate. The final admin budget is private and is never returned by the client dashboard API.

Clients can check out products for delivery or pickup using GCash, cash on delivery, or cash on pickup where configured. They can submit GCash references, confirm received orders, view receipts, and follow notifications.

### Administrator

Administrators review registrations, clients, bookings, projects, technicians, inventory, warehouse operations, sales, orders, reports, and settings. A pending booking must be reviewed and given a positive private PHP budget before it can be confirmed. Approval converts the booking into a project; rejection/decline cancels it. Both decisions notify the client in the portal and by SMS.

Admins assign technicians, manage schedules, inspect progress reports, view actual project material usage, monitor low stock, review warehouse releases, and generate operational reports.

### Technician

Technicians receive assignments and notifications, view projects, submit progress reports, record work completed, issues, next steps, and checklists, request additional materials, and record actual materials used. A project starts at `0%` when assigned, and technician reports update progress based on completed work.

### Warehouse staff

Warehouse staff manage inventory, incoming stock, adjustments, low-stock items, material requests, stock releases, receipts, and inventory movement history. Requests from sales and technicians are reviewed before materials are released.

### Sales staff

Sales staff use the product catalog and POS, record material and installation-service transactions, create receipts, manage orders, request stock, acknowledge warehouse releases, and monitor deliveries.

### Rider

Riders use the delivery workflow to view assigned deliveries, update delivery status, and submit proof of delivery where supported.

## Core workflows

### Service booking

```text
Client selects service and offerings
        ↓
System shows prices and generates project-specific questions
        ↓
Client submits answers, schedule, Mindanao address, and optional attachment
        ↓
Booking is saved as PENDING
        ↓
Admin reviews and allocates private PHP budget
        ↓
Admin confirms or rejects the booking
        ↓
Approved booking becomes a project
        ↓
Admin assigns technician(s)
        ↓
Technician submits progress and material usage
        ↓
Admin monitors completion and reports
```

### Inventory and material usage

```text
Sales or technician requests material
        ↓
Warehouse reviews and approves the request
        ↓
Warehouse releases available stock and creates a receipt
        ↓
Inventory movement is recorded
        ↓
Technician records actual project usage
        ↓
Admin sees usage in the project and reports
```

### Client product orders

```text
Client adds products to cart
        ↓
Client chooses delivery or pickup and payment method
        ↓
Order creates a warehouse request
        ↓
Warehouse verifies stock and releases products
        ↓
Admin or sales advances fulfillment
        ↓
Delivery or pickup is completed
        ↓
Client confirms receipt when applicable
```

## Web routes

### Public

- `/` — landing page
- `/services` and `/services/[slug]` — service catalog and details
- `/products` and `/products/[id]` — product catalog and details
- `/about` and `/contact` — company information and contact form
- `/client/login` and `/client/register` — client authentication
- `/warehouse/login` and `/warehouse/register` — warehouse authentication
- `/sales/login` and `/sales/register` — sales authentication
- `/technician/login` — technician sign-in
- `/forgot-password` — password recovery

### Client portal

- `/client/dashboard` — overview, bookings, orders, notifications, and updates
- `/client/bookings` — booking history
- `/client/services` and `/client/services/[slug]` — authenticated services and booking form
- `/client/products` — authenticated product catalog
- `/client/orders` — order history and actions
- `/client/receipts` — receipts
- `/client/feedback` — feedback submission
- `/client/verify` — email verification

### Staff portals

- `/admin/*` — administrator dashboard and operations
- `/technician/dashboard` — technician work and reports
- `/warehouse/*` — warehouse dashboard, inventory, requests, and receipts
- `/sales/*` — sales dashboard, catalog, POS, orders, requests, receipts, and deliveries
- `/rider/dashboard` — rider delivery dashboard

## Important API groups

### Authentication

`/api/auth/client-register`, `/api/auth/client-login`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/reset-password/verify`, `/api/auth/verify-client-email`

### Client and public operations

- `/api/client/dashboard` — client-scoped bookings, orders, notifications, and status updates. Private admin budgets are removed.
- `/api/client/orders` — client order actions.
- `/api/client/feedback` — feedback submission.
- `/api/client/support` — authenticated Elettro AI Support responses.
- `/api/public/bookings` — verified-client booking submission.
- `/api/public/products` — product catalog data.
- `/api/public/orders` — checkout submission.
- `/api/public/shipping-estimate` — delivery estimate.

### Administration and departments

- `/api/admin` — administrative account, booking, project, technician, and status actions.
- `/api/dashboard` — admin dashboard data.
- `/api/bookings` and `/api/bookings/[id]` — role-scoped booking access.
- `/api/reports` and `/api/department-reports` — project and operational reporting.
- `/api/inventory` and `/api/warehouse-stock` — inventory and stock adjustments.
- `/api/warehouse-requests`, `/api/warehouse-releases`, `/api/warehouse-receipts` — warehouse workflow.
- `/api/project-material-usage` — technician usage entries and admin visibility.
- `/api/sales-sales` — POS sales records.
- `/api/notifications` — role-scoped notifications.

## Data model

The Prisma schema is in [`prisma/schema.prisma`](C:/Users/danie/AndroidStudioProjects/elettro/prisma/schema.prisma). Main records include:

- `User` — all system users and roles.
- `Booking` — service requests, status, schedule, assignment, description, and private admin budget.
- `Project` and `ProjectAssignment` — approved work and technician teams.
- `Report` and `TechnicianActivity` — progress and project updates.
- `ProjectMaterialUsage` — actual materials consumed by technicians.
- `MaterialRequest` — requests for additional materials.
- `InventoryItem` and `InventoryMovement` — stock master data and audit history.
- `WarehouseRequest`, `WarehouseRelease`, and `WarehouseReceipt` — department stock operations.
- `Order` and `OrderItem` — client product orders.
- `SalesSale` and `SalesSaleItem` — POS sales records.
- `Notification` — in-portal notifications.
- `PasswordResetCode` and email-verification records — secure account recovery and verification.

## Location, pricing, and AI support

- Mindanao locations are loaded through [`lib/mindanaoLocations.ts`](C:/Users/danie/AndroidStudioProjects/elettro/lib/mindanaoLocations.ts).
- Offering names, peso prices, and generated booking-question rules are defined in [`components/client/siteData.ts`](C:/Users/danie/AndroidStudioProjects/elettro/components/client/siteData.ts).
- Booking UI and generated questions are implemented in [`ServiceBookingSection.tsx`](C:/Users/danie/AndroidStudioProjects/elettro/components/client/ServiceBookingSection.tsx).
- The floating client assistant is mounted by [`ClientShell.tsx`](C:/Users/danie/AndroidStudioProjects/elettro/components/client/ClientShell.tsx) and rendered by [`ClientSupportWidget.tsx`](C:/Users/danie/AndroidStudioProjects/elettro/components/client/ClientSupportWidget.tsx).
- The assistant endpoint is [`support.ts`](C:/Users/danie/AndroidStudioProjects/elettro/pages/api/client/support.ts). It requires an active, verified client session and uses the client’s latest booking status without exposing private budget data.

## Notifications and integrations

- Gmail SMTP sends registration, booking, and account-related email notifications.
- TextBee sends booking-submitted, booking-approved, and booking-rejected SMS messages to normalized Philippine mobile numbers.
- Cloudinary stores optional booking photos and image assets when configured.
- GCash checkout is enabled only when both public GCash account variables are configured.

## Environment configuration

Copy [`.env.example`](C:/Users/danie/AndroidStudioProjects/elettro/.env.example) to `.env` and replace every placeholder. Never commit `.env` or real credentials.

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="a-long-random-secret"
NEXT_PUBLIC_APP_URL="https://your-domain.example"

GMAIL_USER="your-gmail@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"
ADMIN_EMAIL="admin@example.com"

TEXTBEE_API_KEY="your-textbee-api-key"
TEXTBEE_DEVICE_ID="your-textbee-device-id"

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

NEXT_PUBLIC_GCASH_ACCOUNT_NAME="..."
NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER="..."
```

Use a unique production `JWT_SECRET`. Gmail should use an App Password. GCash variables are public recipient details, not gateway credentials.

## Local development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

The development server runs at `http://localhost:3000`.

Useful commands:

```bash
npm run dev                         # Start development server
npm run build                       # Generate Prisma client and build
npm run start                       # Start production build
npm run prisma:generate             # Regenerate Prisma client
npm run prisma:push                 # Push Prisma schema to the database
npm run prisma:seed                 # Seed or update the administrator account
npx tsc --noEmit --incremental false # Type-check without build info output
```

## Database deployment

Review the migration history in [`prisma/migrations/`](C:/Users/danie/AndroidStudioProjects/elettro/prisma/migrations/) before changing a deployed database. For production, back up the database, review schema changes, apply only approved migrations, generate the Prisma client during the build, and verify authentication, email, SMS, booking, inventory, and order workflows after deployment.

Do not apply unreviewed local database changes to production.

## Security notes

- Client APIs require an authenticated, active, email-verified client session.
- Staff APIs enforce role checks.
- Password reset codes are hashed, expire, and are single-use.
- Client responses remove the private admin booking budget.
- SMS and email failures do not reverse the underlying booking or account decision.
- Keep database, JWT, SMTP, Cloudinary, and TextBee credentials server-side.
- Validate uploaded files and use HTTPS in production.

## Android application

The Android project is located at [`android-app/`](C:/Users/danie/AndroidStudioProjects/elettro/android-app/). The shared staff login layout is [`activity_main.xml`](C:/Users/danie/AndroidStudioProjects/elettro/android-app/app/src/main/res/layout/activity_main.xml). Web client booking, client support, and portal behavior are implemented in the Next.js files documented above.
