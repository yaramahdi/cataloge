# PROJECT MAP — Shein Reseller Dashboard

## TECH_STACK
- **Runtime:** Node.js v22 LTS
- **Backend:** Express 5.2.1
- **Database:** SQLite (better-sqlite3 12.10.0)
- **Image storage:** Disk via multer 2.1.1 → `./uploads/`
- **Frontend:** Vanilla HTML5 + CSS3 + JavaScript (ES6+)
- **Charts:** Chart.js 4.5.1 (CDN)
- **UUID:** uuid 14.0.0

## SYSTEM_FLOW
```
Browser → index.html → hash router → view renders → fetch(/api/*)
                                                          ↕
                                                   Express routes
                                                          ↕
                                                   better-sqlite3 → orders.db
                                                   multer → uploads/
```

**Route map:**
| Hash | View | Purpose |
|------|------|---------|
| `#/orders` | orders.js | قائمة الطلبات |
| `#/orders/new` | orders.js | إضافة طلب |
| `#/orders/:id` | catalog.js | كتالوج المنتجات |
| `#/orders/:id/stats` | stats.js | جدول الإحصائيات |
| `#/orders/:id/charts` | stats.js | الرسوم البيانية |
| `#/stats` | stats.js | الإحصائيات العامة |

## ARCHITECTURE
```
cataloge/
├── server.js              # Express entry, static serve, mount routes
├── package.json
├── routes/
│   └── api.js             # All REST endpoints (orders, products, sales, stats)
├── db/
│   ├── schema.sql         # DDL — 3 tables: orders, products, sales
│   └── database.js        # better-sqlite3 singleton, WAL mode, auto-init
├── public/
│   ├── index.html         # Arabic RTL shell, loads Chart.js CDN
│   ├── css/
│   │   └── style.css      # Full RTL styles, catalog grid, modal, table
│   └── js/
│       ├── app.js         # Router + API helper + DOM helpers
│       └── views/
│           ├── orders.js  # Order list + add form
│           ├── catalog.js # Product grid + image upload + sell modal
│           └── stats.js   # Stats table + Chart.js (bar/line/doughnut)
├── uploads/               # Product images (gitignored)
└── PROJECT_MAP.md
```

### SQLite Schema (3 tables)
- **orders** — id, account_name, total_price, formatted_price, created_at
- **products** — id, order_id FK, image_path, quantity, size, raw_price, selling_price, sold_count, sold_out
- **sales** — id, product_id FK, order_id FK, image_path, raw_price, selling_price, profit, sold_at

### REST API (8 endpoints)
- `GET/POST /api/orders`
- `GET/DELETE /api/orders/:id`
- `POST /api/orders/:id/products` (multipart)
- `POST /api/products/:id/sell` (records sale, deducts qty, auto-calculates profit)
- `DELETE /api/products/:id`
- `GET /api/orders/:id/sales`
- `GET /api/orders/:id/stats`
- `GET /api/orders/:id/charts`

## ORPHANS & PENDING
- [x] M1 — Scaffold + DB init
- [x] M2 — Orders CRUD
- [x] M3 — Product upload + catalog
- [x] M4 — Sold flow
- [x] M5 — Statistics table
- [x] M6 — Charts (bar/line/doughnut)
- [x] M7 — Arabic RTL polish (direction, labels, dates, responsive)
- [x] M8 — Deployment config (Dockerfile + railway.json)
- [x] .gitignore (node_modules, uploads/, *.db)
- [x] Verify all modals close properly when navigating away
- [x] Add image preview in product upload modal
