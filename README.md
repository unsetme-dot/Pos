# Vira Phoneshop — Web App source project

This is the Vira Phoneshop web application source project for a single phone shop. It uses React + Vite, Supabase Auth, and Supabase Postgres. It is not hosted yet; deploy it using the steps below.

## Included in this starter

- Email/password sign-in
- Dashboard: today's revenue/profit, product count, low-stock list
- Product inventory: add and search products
- Point of Sale: cart, customer, payment method, checkout
- Sales history
- Customer credit and installment accounts, down payments, due dates, monthly schedules, balance tracking, and payment history
- Supplier directory, purchase history, payables, supplier payment history, and balances
- Store settings for name, USD/KHR display, and color theme
- Installable PWA for Android Chrome, iOS Safari, and desktop browsers (Vira Phoneshop branding and icons)
- Cloud database shared across signed-in devices
- Atomic checkout function: checks and deducts stock in the database to prevent overselling

## 1. Create the cloud database

1. Create a Supabase project at https://supabase.com/
2. Save the database password securely.
3. Open **SQL Editor** in the Supabase dashboard.
4. Open `supabase/schema.sql` from this project, copy all of it, paste into SQL Editor, and run it.
5. Run `supabase/phase2_modules.sql` after `schema.sql` to add customer accounts, installments, supplier management, and store settings.
6. Go to **Project Settings → API** (or **Connect**) and copy the Project URL and the publishable/anon key.

This starter's Row Level Security policies allow any authenticated account in this one store to access its records. This is suitable only as a first single-store baseline. Before adding separate stores, customer portals, or public registration, implement per-user roles and store-level access policies. Never put the Supabase `service_role` secret in frontend code.

## 2. Create the first staff login

1. In Supabase open **Authentication → Users**.
2. Add/invite the owner's email address and set a strong password.
3. For a private shop, keep public sign-ups disabled. Add staff accounts from the Supabase dashboard.
4. Use those email/password credentials on the POS login screen.

## 3. Run the app locally

Install Node.js 20 LTS or newer.

```bash
npm install
cp .env.example .env
```

Edit `.env` and add the Supabase Project URL and publishable/anon key:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite. Sign in with the user created in Supabase.

## 4. Publish online with Vercel

1. Create a GitHub account and a new **private** repository.
2. Upload/push this project to the repository (do not commit `.env`).
3. Sign in at https://vercel.com/ and import that GitHub repository.
4. Keep the framework preset as **Vite**. Build command: `npm run build`. Output directory: `dist`.
5. In Vercel → Project → Settings → Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy. Vercel will provide a public HTTPS URL for the POS.
7. Open the URL on each phone, tablet, or computer and sign in with the staff account.

Any redeployment after changing environment variables may be required.

## 5. Install on phones and computers

- Android: open the deployed HTTPS URL in Chrome and choose Install app / Add to Home screen.
- iPhone/iPad: open the deployed HTTPS URL in Safari, tap Share, then Add to Home Screen.
- PC: use the browser Install app option where available.
- The service worker caches the app shell and previously loaded static assets. It does not yet queue sales or edits while offline; keep the device online for database reads and writes. Offline transaction queue and automatic conflict-safe sync are not implemented yet.

## 6. Important before real shop use

- Configure a custom domain if desired.
- Enable Supabase database backups / point-in-time recovery according to the plan and business needs.
- Use strong unique passwords and restrict staff access.
- Test checkout, stock deduction, duplicate SKU rejection, and backup/recovery before using live inventory.
- Amounts are stored as entered; switching the currency display between USD and KHR does not convert balances or calculate exchange rates. Choose one store currency before entering live transactions.
- IMEI/serial tracking, warranty, returns, expenses, barcode scanning, printable Khmer receipts, and detailed staff permissions are not yet implemented.
- Do not store card numbers or sensitive payment credentials in this POS.
- A live production deployment requires creating the Supabase and Vercel accounts and configuring them; this archive does not create accounts or publish the site automatically.

## Architecture

Browser (phone/tablet/PC) → Vercel-hosted web app → Supabase Auth + Postgres database.

## Current project status

- This archive contains source code, not a hosted website or an Android APK.
- The web app must be configured with a Supabase project and deployed to an HTTPS host before staff can sign in from their devices.
- PWA installation becomes available after deployment over HTTPS.
- Offline mode currently covers the cached app shell only; sales, payments, and inventory changes still require an internet connection.
- Before real shop use, test the database procedures and permissions with non-production data and configure backups.
