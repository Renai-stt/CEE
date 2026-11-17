# Receipt Tracker 🧾✨

An AI-powered receipt scanner, expense manager, and financial analytics dashboard built with **React**, **Node.js/Express**, **MongoDB (Mongoose)**, and the **Gemini API** (`@google/genai`).

---

## 🌟 Key Features

1. **AI Receipt OCR (Gemini API)**:
   - Utilizes the official `@google/genai` TypeScript SDK with JSON-Schema structured output (`responseSchema`).
   - Powered by the model configured via `GEMINI_MODEL` (defaults to `gemini-3.8-flash`).
   - Seamlessly converts **Thai Buddhist-Era years** (e.g. 2569 -> 2026, 2567 -> 2024).
   - Extracts merchant name, ISO date, time, currency (default THB), payment method, line items (quantity, unit price, total), VAT 7%, discounts, and grand totals.
   - Detects non-receipt images or unreadable/blurry uploads with clear feedback.

2. **Interactive Review & Edit**:
   - Split layout: high-resolution receipt photo with zoom & pan controls on one side, editable form on the other.
   - Dynamic line items editor with automatic math checks.
   - Real-time balance discrepancy warning if the sum of items differs from the grand total, plus 1-click auto-recalculate.

3. **Multi-User Authentication**:
   - Secure register & login with bcrypt password hashing and JWT in httpOnly cookies (access + refresh tokens).
   - Strict `userId` isolation enforced on every query and mutation.
   - 1-click **Demo Account** for instant test drives without email sign-up.

4. **Spending Analytics Dashboard**:
   - KPI metric cards: Total spend, this month vs. last month with percentage delta, total receipt count, and average spend per receipt.
   - Recharts visual charts:
     - Spend over time (area chart) with responsive date formatting.
     - Expense category distribution (donut chart).
     - Top merchants ranked by expenditure (horizontal bar chart).
   - Global date range filter (This Month, Last 30 Days, All Time, or Custom Range).

5. **Spreadsheet Exports**:
   - **CSV Export**: one row per line item with UTF-8 BOM for seamless Thai text support in Microsoft Excel.
   - **Excel XLSX Export**: formatted spreadsheet with optimized column widths.
   - **Google Sheets**: 1-click clipboard TSV copy for instant paste (`Ctrl+V`) into Google Sheets.

6. **Bilingual UI & Dark Mode**:
   - Thai by default (ภาษาไทย) with an English (EN) toggle in the navbar.
   - Dark, Light, and System theme toggle persisted in `localStorage`.

---

## 🏗️ Project Architecture

```
/
├── server.ts                  # Server entry point (Express API + Vite middleware in dev)
├── shared/
│   └── types.ts               # Shared TypeScript models and interfaces
├── server/
│   ├── config.ts              # Server environment configurations
│   ├── app.ts                 # Express app setup (Helmet, CORS, rate limits, routes)
│   ├── db/
│   │   ├── connection.ts      # Mongoose connection with resilient local dev datastore
│   │   ├── repository.ts      # Data access layer strictly isolated by userId
│   │   └── models/
│   │       ├── User.ts        # Mongoose User schema & model
│   │       └── Receipt.ts     # Mongoose Receipt schema with indexes on (userId, date) and (userId, merchant)
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification & token generator
│   │   ├── upload.ts          # Multer storage & magic-bytes MIME inspection
│   │   └── rateLimiter.ts     # Rate limiting for auth and upload endpoints
│   ├── services/
│   │   ├── gemini.ts          # Gemini structured OCR & Thai Buddhist year converter
│   │   ├── storage.ts         # IStorageService interface & LocalStorage implementation
│   │   └── export.ts          # CSV with UTF-8 BOM & XLSX generators
│   └── routes/
│       ├── auth.routes.ts     # /api/v1/auth (register, login, logout, refresh, me)
│       ├── receipt.routes.ts  # /api/v1/receipts (upload, save, list, get, update, delete)
│       ├── dashboard.routes.ts# /api/v1/dashboard/summary
│       └── export.routes.ts   # /api/v1/export (csv, xlsx, data)
├── src/
│   ├── components/            # Header Navbar, modals, lightbox
│   ├── context/               # AuthContext, ThemeContext, LanguageContext
│   ├── i18n/                  # Thai & English translation dictionaries
│   ├── pages/                 # Dashboard, Upload, Review, ReceiptList, Export, Login, Register
│   ├── utils/                 # Category metadata, currency & date formatters
│   ├── App.tsx                # Client router and route guards
│   └── index.css              # Tailwind CSS styles & dark mode variant
└── tests/
    ├── geminiParser.test.ts   # Buddhist year and math check unit tests
    └── dashboardAggregator.test.ts # Aggregation calculations unit tests
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- (Optional) Docker & Docker Compose or MongoDB Atlas

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is present. You can adjust `GEMINI_MODEL` (e.g. `gemini-3.8-flash`).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The app runs at `http://localhost:3000`.

*Note: If no external MongoDB daemon is detected, the server automatically enables a resilient file-persisted JSON database (`data/db.json`), allowing instant full-stack development without installing MongoDB locally.*

---

## 🐳 Running with Docker Compose (App + MongoDB)

To run the complete stack with an actual MongoDB 7.0 container:
```bash
docker-compose up --build
```
This starts:
- `app` at `http://localhost:3000`
- `mongo` on port `27017` with healthy ping checks and data persistence via `mongo_data` volume.

---

## 🧪 Running Unit Tests

Run the test suite verifying Gemini OCR parsing, Thai Buddhist-era conversion, math balances, and dashboard metrics:
```bash
npx tsx tests/geminiParser.test.ts
npx tsx tests/dashboardAggregator.test.ts
```

---

## ⚠️ Known Limitations & Considerations
1. **Gemini API Quotas**: Extremely large batches (>10 receipts simultaneously) on free tier keys may trigger rate limits; the app incorporates upload rate limiters and concurrent queue throttling.
2. **HEIC Transcoding**: Web browsers natively render JPEG/PNG/WEBP. Modern iOS HEIC files are accepted and processed by Gemini; when rendering in older web browsers, converting to standard JPG/WebP before preview is recommended.
3. **Receipt Paper Quality**: Extremely crumpled, thermal-faded, or torn receipts may produce partial line items; the interactive Review screen allows manual edits prior to saving.
