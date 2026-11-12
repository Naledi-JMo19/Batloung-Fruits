# Verification of this version

Checked on 5 November 2026.

## Automated checks

- Frontend production build: passed (`npm run build`).
- ESLint: passed for frontend, backend and included test files (`npm run lint`).
- Four unit tests: passed (`npm --prefix backend test`). Checks cover next-step status progression, terminal statuses, JWT/role enforcement and refusal of insecure signing-secret defaults.
- Nine integration scenarios: passed against an isolated MariaDB 10.11.7 database (`npm --prefix backend run test:integration`). Node reports ten tests when the parent suite is included.

The integration scenarios cover:

1. Authentication and Sales restrictions.
2. Five fruits, nine provinces, three box sizes and 15 product configurations.
3. Fruit reactivation without duplicate products or lost prices, plus duplicate rejection.
4. Adding a missing permitted fruit with its product configurations, stock rows and source-province links.
5. Incoming purchase history and stock updates.
6. Quantity validation and database-derived prices/totals.
7. Sequential statuses, Administrator-only completion, one-time stock deduction and cancellation without deduction.
8. All eight reports and dashboard figures.
9. Unique generated account passwords, password hashes, repeat setup without password changes, and explicit credential/secret rotation.

## Browser checks

Performed with the actual React frontend, Express API and a temporary MariaDB database, without mocked API responses:

- Administrator login.
- Disabled Add/reactivate when all five fruits are active; deactivation and reactivation through the form.
- Creating an order while the Small box filter remains selected: the new order appears immediately.
- Only the next status and cancellation offered in the order dialog.
- Complete status progression in the browser; 20 Apple boxes become 17 after completing a 3-box order.
- Sales login hides supplier/report management and stock receiving controls.
- Desktop 1440px and phone 390px layouts reviewed; no document-wide horizontal overflow at 390px; order modal fits the phone viewport.
- No JavaScript page errors during the tested workflow.

## Palette preservation

The original `src/index.css` is byte-for-byte unchanged. Its SHA-256 is:

`0c91384409ab6f4979bf55e4e74d312fa84071d62713097131ad086561794939`

The original fruit colour constants in `src/api.js` are unchanged. `src/responsive-fixes.css` adds only layout/overflow rules and contains no colour declarations.

## Scope of verification

Oracle MySQL was not separately run; SQL/API tests used MariaDB 10.11.7. The schema targets MySQL 8.0.16+ or MariaDB 10.11+. Google Maps/geocoding need your own key and internet access and were not tested with a live key. Public deployment and GitHub publication were not performed. Your group must supply its repository URL and actual individual contributions.

Follow `DEMONSTRATION.md` to repeat the acceptance walkthrough on your own computer.
