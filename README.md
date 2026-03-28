# 🐔 Poultry Tracker

A sales and business management web app built for a poultry business. Records daily sales, tracks stock purchases, manages credit customers, and provides monthly analytics — all from any device.

## Live App

[poultry-tracker.vercel.app](https://poultry-tracker.vercel.app)

---

## Features

- **Record Sales** — Select product, choose unit (bag/kg/paint/sachet etc.), quantity auto-calculates total
- **Payment Tracking** — Mark sales as Cash, Transfer, or Credit
- **Credit Management** — View all unpaid credit sales, mark as settled when customer pays
- **Stock Records** — Log every restock purchase with cost price and date
- **Analytics** — Monthly revenue charts, top products, daily trends
- **Admin Panel** — Manage products with multiple units and prices per product
- **Multi-user** — Staff can log in and record sales; only admins see the Admin tab
- **PWA** — Installable on Android as a home screen app

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |

---

## Getting Started (New Deployment)

### 1. Clone the repo

```bash
git clone https://github.com/Ireolu573/poultry-tracker.git
cd poultry-tracker
npm install --legacy-peer-deps
```

### 2. Set up Supabase

- Create a new project at [supabase.com](https://supabase.com)
- Go to SQL Editor and run the migration files in order:
  1. `01_initial_schema.sql`
  2. `02_add_payments_and_stock.sql`
  3. `03_add_product_units.sql`

### 3. Configure environment variables

Create a `.env.local` file in the root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Make yourself admin

After signing up on the app, run this in Supabase SQL Editor:

```sql
update profiles set is_admin = true
where email = 'your-email@example.com';
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Vercel

- Import the GitHub repo on [vercel.com](https://vercel.com)
- Add the two environment variables in Vercel project settings
- Deploy

---

## Reusing for Another Business

This codebase is designed to be reusable. To deploy for a different business:

1. Create a new Supabase project and run the SQL schemas
2. Create a new Vercel project pointing to the same GitHub repo
3. Set the new project's environment variables in Vercel
4. Customize branding, product names, and units from the Admin panel

---

## Project Structure

```
src/
├── components/
│   ├── AdminPage.tsx      # Product management (admin only)
│   ├── Analytics.tsx      # Monthly charts and reports
│   ├── Auth.tsx           # Login / signup
│   ├── CreditManager.tsx  # Pending credit sales
│   ├── SaleForm.tsx       # Record a sale
│   ├── SalesTable.tsx     # Sales history
│   └── StockForm.tsx      # Restock records
├── lib/
│   └── supabase.ts        # Supabase client
├── App.tsx
└── main.tsx
```

---

## License

Private project. Not open for public contribution.
