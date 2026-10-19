# Elettro Booking

Next.js app scaffold for electrical installation and maintenance booking system. Deploy to Vercel and use Neon Postgres as the database.

Quick start

1. Install dependencies: `npm install`
2. Configure `DATABASE_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `NEXT_PUBLIC_APP_URL`. Generate `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and use the deployed site origin for `NEXT_PUBLIC_APP_URL`.
3. Run `npx prisma db push` to apply the schema, including client email verification, authentication rate limiting, and order fulfillment fields/statuses.
4. Start dev server: `npm run dev`

Client registrations remain inactive until a single-use verification link is opened and explicitly confirmed. Email verification requires the Gmail SMTP credentials above; failed delivery is logged and does not activate the account. In production, use a unique random `JWT_SECRET` of at least 32 characters and an HTTPS `NEXT_PUBLIC_APP_URL`.

Verified clients can add products to their cart, then check out for delivery or pickup. Available payments are GCash (manual transfer), cash on delivery, and cash on pickup. Configure `NEXT_PUBLIC_GCASH_ACCOUNT_NAME` and `NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER` in the deployment environment to enable GCash and show the recipient details; these are public recipient details, not gateway credentials. GCash stays disabled until both values are configured. Admins set and confirm the delivery fee and can save pickup/delivery instructions before confirming the order. The client then submits the GCash transaction reference; an administrator must verify receipt and mark it paid. Admins advance fulfillment through preparation, shipping or pickup readiness, and delivery; clients confirm receipt from their dashboard. Cash payment is recorded by an administrator after delivery or client-confirmed pickup. Run `npx prisma db push` before deploying these order workflow changes.
