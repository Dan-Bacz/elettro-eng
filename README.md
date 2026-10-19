# Elettro Booking

Next.js app scaffold for electrical installation and maintenance booking system. Deploy to Vercel and use Neon Postgres as the database.

Quick start

1. Install dependencies: `npm install`
2. Configure `DATABASE_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `NEXT_PUBLIC_APP_URL`. Generate `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and use the deployed site origin for `NEXT_PUBLIC_APP_URL`.
3. Run `npx prisma db push` to apply the schema, including client email-verification and authentication rate-limit tables.
4. Start dev server: `npm run dev`

Client registrations remain inactive until a single-use verification link is opened and explicitly confirmed. Email verification requires the Gmail SMTP credentials above; failed delivery is logged and does not activate the account. In production, use a unique random `JWT_SECRET` of at least 32 characters and an HTTPS `NEXT_PUBLIC_APP_URL`.
