# Batloung Fruits Distribution Management System

DIWA2110 full-stack group assignment. React + React Router + Node.js/Express + MySQL.

Your original CSS files and colour palette are unchanged. This version fixes the fruit catalogue controls, box-size order filter, status sequence, and setup credentials.

## 1. Requirements

- Node.js 22.12 or newer (or a supported newer LTS release).
- MySQL 8.0.16+ with CHECK constraints, or MariaDB 10.11+.
- VS Code and two terminals.

## 2. Create the database

Open `backend/database/schema.sql` in MySQL Workbench or your SQL client and execute it. It creates the database, relationships, five fruits, nine provinces, three box sizes, 15 products, suppliers and sample vendors. Stock starts at zero.

The script is for a **fresh installation** and refuses to overwrite an existing database. If you already have the original application database, keep it: no migration is required for these fixes. Do not rerun the full schema on existing data. The old vendor-location migration is only for older databases that do not have latitude/longitude columns.

## 3. Set up the backend

From the extracted project folder:

```sh
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` in VS Code. Enter your own `DB_USER`, `DB_PASSWORD`, host and port. Leave `JWT_SECRET` blank for now. Then run:

```sh
npm run setup
```

Setup generates a strong JWT secret and creates `admin` and `sales` accounts with **different random passwords**. Open `backend/.local-accounts.txt` to see your passwords. There are no shared/default passwords. Keep this file private; it is ignored by Git.

If you already used an older version with default accounts, rotate those credentials before starting this version:

```sh
npm run setup -- --reset-users
```

This resets both account passwords and rotates the JWT secret, so old login tokens stop working. Restart the API afterwards. Normal `npm run setup` preserves existing account passwords.

Start the backend:

```sh
npm start
```

The API runs on `http://localhost:5000`. Keep that terminal open.

## 4. Start the frontend

Open another terminal in the project root (the folder containing `src`):

```sh
npm ci
npm run dev
```

Open `http://localhost:5173` and log in with `admin` or `sales`, using the private password from setup. If Vite chooses a different port, free port 5173 or update `CLIENT_ORIGIN` in `backend/.env` to the actual origin and restart the API.

Optional: copy the root `.env.example` to `.env` to set the API URL and map configuration. Google Maps is optional; the core stock, order and reporting features do not require a Maps key.

## 5. What changed

- Fruits: Add/reactivate lists only missing or inactive permitted fruits. It is disabled when all five are active. Reactivation preserves prices, product IDs and stock. Adding a missing fruit creates its three product configurations, zero-stock rows and source-province links. Existing fruit names are fixed; descriptions and activation can be edited.
- Order filter: box sizes are returned with the orders list. There is no cached per-order filter data to go stale after adding an order.
- Statuses: Pending → Confirmed → Processing → Ready for Collection/Delivery → Completed. Skipping steps and moving backwards are rejected. Cancellation is allowed before completion. Only Administrator can complete an order.
- Credentials: setup creates unique local passwords and a random signing secret. The API refuses a blank, short or known placeholder secret. Passwords are hashed in the database and are not printed in logs.
- Responsive layout: a separate layout-only stylesheet prevents the mobile navigation from stretching the page. No original CSS or colour values were changed.
- Documentation: demonstration guide, test commands, GitHub instructions and updated diagrams.

## 6. Roles

| Action | Administrator | Sales |
|---|---|---|
| Manage suppliers, stock, fruits, prices and reports | Yes | No |
| View fruits, products, box sizes and available stock | Yes | Yes |
| Register and view street vendors | Yes | Yes |
| Edit/delete vendors | Yes | No |
| Create/view orders | Yes | Yes |
| Confirm, process, mark ready or cancel | Yes | Yes |
| Complete an order and deduct stock | Yes | No |

Permissions are enforced in the backend as well as the interface.

## 7. Business rules

Prices come from MySQL, never from the browser. Orders must contain at least one valid item for an active registered vendor. Quantities must be positive whole numbers and cannot exceed available stock. Duplicate product lines are merged before validation.

Receiving stock saves the purchase and increments stock in one transaction. Completing an order locks and rechecks stock, then deducts it once. Cancellation never deducts stock. Completed and cancelled orders cannot change. Pending orders do not reserve stock: if another order consumes it first, completion is rejected until stock is replenished.

## 8. Tests and build

From the project root:

```sh
npm run build
npm run lint
npm --prefix backend test
npm --prefix backend run test:integration
```

The integration test needs a running MySQL/MariaDB server and database credentials in `backend/.env` with permission to create/drop a database. It creates a randomly named `batloung_test_...` database and removes only that database afterwards. It never uses or drops `batloung_fruits`. Use a local development server for this test.

Read `docs/DEMONSTRATION.md` for the browser walkthrough and `docs/VERIFICATION.md` for the checks performed on this delivery.

## 9. API

All endpoints are under `/api`. Except login, requests need `Authorization: Bearer <token>`.

| Resource | Endpoints |
|---|---|
| Authentication | POST /auth/login, GET /auth/me |
| Fruits | GET /fruits, GET /fruits/:id, POST /fruits, PUT /fruits/:id, DELETE /fruits/:id |
| Suppliers | GET /suppliers, GET /suppliers/:id, POST /suppliers, PUT /suppliers/:id, DELETE /suppliers/:id |
| Vendors | GET /vendors, GET /vendors/:id, POST /vendors, PUT /vendors/:id, DELETE /vendors/:id |
| Stock | GET /stock, POST /stock, PUT /stock/:id, GET /stock/purchases |
| Orders | GET /orders, GET /orders/:id, POST /orders, PUT /orders/:id (status), DELETE /orders/:id |
| Catalogue | GET /box-sizes, PUT /box-sizes/:id, GET /products, PUT /products/:id, GET /provinces |
| Dashboard | GET /dashboard |
| Reports | GET /reports, GET /reports/:name |

Report names: `stock`, `sales-by-fruit`, `sales-by-box-size`, `sales-by-vendor`, `purchases-by-province`, `pending-orders`, `completed-orders`, `sales-by-date`.

HTTP codes: 200/201 success; 400 validation; 401 login required; 403 permission denied; 404 not found; 409 duplicate/invalid status/in-use record; 500 unexpected server error.

## 10. Google Maps (optional)

Supplier maps show a route from `VITE_ORIGIN_ADDRESS` (default Maseru, Lesotho) to the supplier's address. Set the real Batloung business address in the frontend `.env` for a precise origin.

For selecting vendor pins, enable Maps JavaScript API and Geocoding API in your Google Cloud project, restrict your key to your application origin and set `VITE_GOOGLE_MAPS_API_KEY` in the root `.env`. Restart Vite. Without a key, an area preview is shown instead of a selectable map. Internet access is required for maps.

## 11. GitHub and submission

Upload the source, lockfiles, schema, README and `docs` folder to your group repository. Do not upload `node_modules`, `.env`, `.local-accounts.txt` or real customer data. The included `.gitignore` excludes these local files.

Add your repository URL and each member's real contribution to the submission. Each member should demonstrate and explain their work. GitHub publication and individual contributions must be completed by your group.
