# LabelForge Pro 🏷️

**Product Label Management System** — Generate print-ready product labels with barcodes in bulk.

Built for garment/textile businesses. Eliminates manual Canva label creation.

---

## Quick Start (Local Setup)

### Step 1 — Install Node.js
Download from: **https://nodejs.org** → Install the LTS version  
(Just click Next → Next → Install. No configuration needed.)

### Step 2 — Open Terminal / Command Prompt
- **Windows:** Press `Win + R` → type `cmd` → Enter
- **Mac:** Press `Cmd + Space` → type `Terminal` → Enter

### Step 3 — Navigate to this folder
```bash
cd path/to/labelforge-pro
```
Example (Windows): `cd C:\Users\YourName\Downloads\labelforge-pro`
Example (Mac): `cd ~/Downloads/labelforge-pro`

### Step 4 — Install dependencies (one time only)
```bash
npm install
```
Wait for it to finish (1-2 minutes, downloads packages).

### Step 5 — Run the app
```bash
npm run dev
```

The app opens automatically at **http://localhost:3000**

---

## Daily Use (after setup)
Just run `npm run dev` in the project folder. Browser opens automatically.

---

## Push to GitHub

1. Create a new repo at github.com (click "New repository")
2. Run these commands in the project folder:
```bash
git init
git add .
git commit -m "Initial LabelForge Pro setup"
git remote add origin https://github.com/YOUR_USERNAME/labelforge-pro.git
git push -u origin main
```

---

## Features

- ✅ Product catalog management
- ✅ Variant management with bulk size entry
- ✅ Auto-generated SKUs (configurable format)
- ✅ Barcode generation (Code128)
- ✅ Label template builder (label size, grid, fonts)
- ✅ 3-step label generator wizard
- ✅ Live A4 sheet preview before printing
- ✅ Print job history + reprint
- ✅ CSV import (products + variants)
- ✅ CSV export (products, variants, complete label data)
- ✅ All data saved locally in browser

---

## Project Structure

```
labelforge-pro/
├── src/
│   ├── engine/
│   │   ├── SKUEngine.js       ← SKU generation logic
│   │   └── LabelEngine.js     ← Label grid + layout engine
│   ├── store/
│   │   ├── reducer.js         ← App state (useReducer)
│   │   └── initialData.js     ← Sample data + defaults
│   ├── components/
│   │   ├── ui/                ← Reusable UI (Modal, Confirm, Toast, etc.)
│   │   ├── Barcode.jsx        ← Barcode renderer
│   │   ├── Label.jsx          ← Single label renderer
│   │   └── LabelSheet.jsx     ← Full A4 sheet renderer
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── SKUs.jsx
│   │   ├── Templates.jsx
│   │   ├── Generator.jsx
│   │   ├── PrintJobs.jsx
│   │   ├── ImportExport.jsx
│   │   └── Settings.jsx
│   ├── utils/
│   │   └── csv.js             ← CSV parse + download utilities
│   ├── styles/
│   │   └── globals.css        ← All styles
│   ├── App.jsx                ← Main app shell + routing
│   └── main.jsx               ← Entry point
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## Database (Future Upgrade Path)

Currently: **browser localStorage** (perfect for single-user local use)

When ready to upgrade to cloud/multi-user:
- Backend: Supabase (PostgreSQL)
- The `schema.sql` file in this repo has the complete database schema ready to deploy

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build tool | Vite 5 |
| Barcodes | JsBarcode |
| CSV | Papa Parse |
| Fonts | Google Fonts (Syne, DM Sans, JetBrains Mono) |
| Storage | localStorage (browser) |

---

## Adding New Features

All business logic is in `src/engine/`:
- `SKUEngine.js` — change SKU generation rules here
- `LabelEngine.js` — change label layout math here

All pages are in `src/pages/` — each page is self-contained.

---

*Made for Hari Vastra. Built to replace Canva label creation.*
