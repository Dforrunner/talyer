# ShopFlow Follow-Up Tasks

Review date: 2026-06-04

Operating assumptions:
- This app is used offline on one desktop and tablet by a small mechanic shop.
- The primary user is non-technical and needs the app to be self explanatory
- Invoicing should never be blocked because inventory records are behind reality. If an item is added to an invoice, treat it as already used by the shop.
- If recorded inventory would go below zero, assume the shop had the stock physically available but the system was not updated. Keep the workflow moving and make the inventory discrepancy easy to understand and correct later. Instead of having inventory go negative you can keep it at zero and record the sale of the product
- In this shop, an invoice is also the live job record. A customer drop-off starts an invoice, and that same invoice may be updated over days, weeks, or longer.
- A job becomes finished only when the work is done and the customer has paid. The owner should be able to mark it paid/completed from both the Active Invoices card and the invoice edit page.
- Employee payments can happen before a job is complete. Salary/payment records should be able to link to active draft jobs, not only completed invoices.
- Past invoices are also past job records. The owner needs to quickly find what work was done before on a customer or vehicle.
- Existing shop data is more important than any new feature. Updates must preserve the local SQLite database, uploaded logo, saved invoice PDFs, backups, and any legacy app data paths.
- Any task that changes database tables, invoice status meanings, inventory behavior, import/export format, file storage paths, or financial calculations must include explicit migration steps and a rollback/backup plan.
- Favor plain language, obvious navigation, strong empty states, and guided setup over advanced configuration.

Validation snapshot:
- `pnpm typecheck` passed.
- `pnpm exec next build --webpack` passed.
- `pnpm lint` failed because `eslint` is not installed even though `package.json` has a `lint` script.
- `node scripts/validate-production.js` failed on the stale App Page Routing check.
- Translation key coverage is structurally complete: 454 `en` keys, 454 `tl` keys, 411 used keys, 0 missing used keys. There are 43 unused keys and multiple Tagalog strings still written in English or mixed language.

Upgrade and breaking-change policy:
- Every implementation task must state `Breaking change: No`, `Potential breaking change`, or `Breaking change: Yes` in its PR/agent handoff notes.
- If a task is a potential or actual breaking change, it must include `Migration steps`, `Automatic backup behavior`, `Rollback plan`, and `Verification on old data`.
- Never rely on the owner manually exporting data before an update. The app should create a timestamped pre-update backup of `shopflow.db` and managed asset folders before any schema or data migration runs.
- Migrations must be idempotent and safe to rerun. Running the updated app twice must not duplicate rows, double-subtract inventory, rewrite paid dates, or lose links between invoices, invoice items, products, employees, and salary payments.
- Prefer additive migrations. Do not drop columns/tables or delete records during an update unless a previous automatic backup exists and the release notes explain the change in owner-friendly language.
- UI label/navigation changes are not database-breaking, but they can still be training-breaking. Flag those as `Workflow/training change` and update first-run help and release notes.

Potential breaking-change flags already identified:
- Task 2 changes inventory semantics. It must migrate carefully if a `stock_adjustments` table or stock-clamping behavior is added.
- Task 5 changes the user-facing meaning of invoice `draft` into active job. It must preserve all existing draft invoices as jobs in progress.
- Task 6 adds or relies on salary-to-invoice links. It must preserve existing salary records even when they have no linked invoice.
- Task 8 changes report semantics. It may not require data migration, but it needs release notes because old and new totals may not match.
- Task 10 is required before shipping any schema-changing update.
- Task 11 changes import/export behavior and must remain compatible with old backup files.
- Task 21 changes release/update documentation and must flag any breaking changes clearly.
- Task 22 changes the business address model and must preserve existing address/city/postal data.

## Task 1: Add Working Lint Tooling

Priority: P2
Recommended model: `gpt-5-codex`
Files: `package.json`, possible new ESLint config files

Context:
- `package.json:24` defines `"lint": "eslint ."`.
- Running `pnpm lint` currently fails with `sh: eslint: command not found`.
- The project uses Next 16, React 19, TypeScript strict mode, Tailwind 4, and shadcn-style components.

Implementation notes:
- Add the correct ESLint dev dependencies and a flat ESLint config compatible with Next 16.
- Include TypeScript, React hooks, and basic accessibility checks.
- Keep rules practical for the current codebase; start with warnings where the repo has known legacy issues.
- Do not rewrite unrelated source files just to satisfy formatting.

Acceptance checks:
- `pnpm lint` runs without command-not-found errors.
- `pnpm typecheck` still passes.
- Document any intentionally disabled lint rules in the config with short comments.

## Task 2: Make Invoice-First Inventory Reconciliation Easy to Understand

Priority: P0
Recommended model: `gpt-5-codex`
Files: `components/pages/invoice-creator.tsx`, `components/pages/active-invoices.tsx`, `components/pages/invoice-history.tsx`, `lib/translations.ts`, possibly `lib/db.ts`
Breaking change: Potential breaking change. Stock behavior and any new stock audit table must preserve existing product quantities and must not double-adjust stock on old invoices.

Context:
- Invoice validation checks descriptions, quantity, and unit price at `components/pages/invoice-creator.tsx:565`, but does not enforce stock availability.
- Product stock is adjusted on every save, including draft saves, at `components/pages/invoice-creator.tsx:653` and after item insertions below that block.
- `notEnoughStock` exists in translations but is unused.
- Deleting any invoice restores product stock in both active invoices and invoice history at `components/pages/active-invoices.tsx:141` and `components/pages/invoice-history.tsx:176`.
- Business rule from the owner: do not block invoicing for low or negative inventory. If a product is used on an invoice, assume the physical stock existed and the app inventory count was outdated.

Implementation notes:
- Do not prevent saving or completing an invoice because stock is low.
- Prefer clamping displayed stock to zero instead of showing negative quantities. If recorded stock is 1 and the invoice uses 3, treat it as "stock record was short by 2" and leave the product at 0 after save.
- Add a user-friendly inventory notice such as "Inventory was lower than this invoice. We kept the invoice and set stock to 0. Update stock later if needed."
- Consider adding a simple `stock_adjustments` or audit entry for these cases so the Inventory page can show "Needs stock update" without confusing the owner.
- If adding a `stock_adjustments` table, include a migration that creates the table without changing existing invoice/product records. Do not backfill historical adjustments unless there is a verified way to avoid double-counting.
- Rename or replace `notEnoughStock`; the app should not say the user cannot save. A better key is `inventoryNeedsUpdate`.
- Be careful when editing saved drafts: use the previous saved quantity to avoid double-subtracting stock.
- Define delete behavior plainly. Recommended: deleting an invoice means "undo this invoice," so restore the invoice quantities to inventory and explain that this should only be used for mistakes or canceled work.
- Add a focused manual test matrix for create draft, edit draft, complete invoice, delete draft, delete paid invoice, and invoice quantity greater than recorded stock.

Acceptance checks:
- Invoicing is never blocked by low stock.
- Product stock shown to the user does not become negative unless the product owner explicitly chooses to show negative counts.
- The user gets a clear, non-technical explanation when stock records were lower than the invoice quantity.
- Draft edit flows do not double-subtract stock.
- Deleting invoices restores stock according to the documented "undo this invoice" behavior.
- The old `notEnoughStock` translation is replaced, repurposed, or removed.

## Task 3: Generate Collision-Safe Invoice Numbers

Priority: P0
Recommended model: `gpt-5-codex`
Files: `components/pages/invoice-creator.tsx`, `lib/db.ts`

Context:
- `components/pages/invoice-creator.tsx:550` generates invoice numbers from `COUNT(*) + 1` for the invoice date.
- `lib/db.ts` also has a separate `generateInvoiceNumber` implementation.
- If an invoice is deleted or imported with gaps, `COUNT(*) + 1` can collide with an existing invoice number for that day.

Implementation notes:
- Consolidate invoice number generation into one utility.
- Query the max existing sequence for the date prefix, not the row count.
- Handle unique constraint failures with a bounded retry inside the save transaction.
- Keep local date behavior consistent with `getLocalDateInputValue`.

Acceptance checks:
- Creating invoices after deleting an earlier invoice on the same date does not collide.
- Importing old invoices does not break future sequence generation.
- Both invoice creator and any shared DB helper use the same generation logic.

## Task 4: Fix Print/Preview After Silent Autosave

Priority: P1
Recommended model: `gpt-5-codex`
Files: `components/pages/invoice-creator.tsx`, `lib/invoice-pdf.ts`, `lib/invoice-print-html.ts`

Context:
- `handlePrintInvoice` saves a draft through `ensureDraftSavedForOutput` at `components/pages/invoice-creator.tsx:915`, but then builds `printableInvoice` from React state at `components/pages/invoice-creator.tsx:938`.
- React state may still contain `invoice_number || t('draft')` immediately after silent save, so print output can show the draft label instead of the generated invoice number.
- The visible invoice number field also displays `invoice.invoice_number || t('draft')` at `components/pages/invoice-creator.tsx:1280`.

Implementation notes:
- Have `saveInvoice` return the persisted invoice snapshot, not only the id.
- Use that returned snapshot for immediate print/download/preview output after silent autosave.
- Keep preview modal and PDF generation aligned with the same persisted data.

Acceptance checks:
- Printing a never-saved invoice with enough content shows the generated invoice number, not `Draft`.
- Downloaded PDF and browser print view show the same invoice number and totals.

## Task 5: Make Active Invoices Work as Long-Running Job Cards

Priority: P0
Recommended model: `gpt-5` for workflow design, `gpt-5-codex` for implementation
Files: `components/pages/active-invoices.tsx`, `components/pages/invoice-creator.tsx`, `components/pages/invoice-history.tsx`, `components/modals/invoice-detail-modal.tsx`, `lib/translations.ts`, possibly `lib/db.ts`
Breaking change: Workflow/training change and potential data migration. Existing `draft` invoices must remain editable active jobs after the update.

Context:
- The owner starts an invoice when a customer drops off a vehicle.
- That invoice is a live job record and may stay active for days, weeks, or longer.
- The owner updates the same invoice as parts, labor, notes, and vehicle/job details change.
- When the job is done and the customer has paid, the invoice should be marked paid/completed.
- The owner needs to do that from both the Active Invoices page cards and the invoice edit page.

Implementation notes:
- Treat `status = 'draft'` as "active job" in the user-facing UI. Avoid making the owner think "draft" means incomplete paperwork only.
- Consider user-facing labels:
  - Active Job
  - In Progress
  - Ready for Payment
  - Paid / Completed
- Active invoice cards should show job age, last update, vehicle, customer, total, linked salary payments if available, and clear actions:
  - Continue Job
  - Mark Paid / Complete
  - Print / Download
  - View Details
  - Delete / Cancel only as a secondary destructive action
- Invoice edit page should have the same clear completion action, not only save draft.
- Marking paid/completed should set `status = 'paid'`, `paid = 1`, `paid_at`, and `completed_at`, and should route the user to an understandable next step.
- Add confirmation copy that says the job will move from active jobs to invoice history.
- Keep old status values normalized, but expose simple labels to the owner.
- Migration must not convert existing `draft` invoices to paid/completed. Only legacy completed/sent/open statuses should be normalized where already intended by previous versions.

Acceptance checks:
- A job can remain active and editable for a long time without losing data.
- The owner can mark the job paid/completed from Active Invoices and from the invoice edit page.
- After completion, the job leaves Active Invoices and appears in Invoice History.
- The UI uses job-oriented wording that a mechanic shop owner can understand.
- Completion does not require inventory to be perfectly updated.

## Task 6: Support Employee Payments Before a Job Is Finished

Priority: P0
Recommended model: `gpt-5` for finance/workflow design, `gpt-5-codex` for implementation
Files: `components/pages/salaries.tsx`, `components/pages/active-invoices.tsx`, `components/pages/invoice-creator.tsx`, `components/pages/revenue-tracking.tsx`, `lib/db.ts`, `lib/translations.ts`
Breaking change: Potential breaking change. Salary schema changes must keep old salary payments visible even if employee or invoice links are missing.

Context:
- Employees may get paid for a job while the vehicle is still in the shop.
- Salary payments already support `invoice_id`, and the salary page lists draft invoices as options.
- The workflow needs to make this easy and obvious, not something hidden in an accounting page.

Implementation notes:
- Keep allowing salary payments to link to active/draft invoices.
- Consider adding a "Record Employee Pay" action on active job cards or in the invoice edit page.
- Show linked employee payments on the active job detail/edit view so the owner can see labor paid so far.
- Salary reports should count payments by `paid_at`, even if the linked invoice is not complete yet.
- Revenue/profit reports should make this timing clear: salaries paid this month are expenses this month, while sales revenue comes when invoices are paid/completed.
- Use simple language such as "Paid workers for this job" instead of accounting terms.
- Any new foreign key/index migration must allow `invoice_id` to stay nullable so older unlinked salary payments remain valid.

Acceptance checks:
- The owner can record employee pay against an active unfinished job.
- Linked salary payments remain visible when viewing or editing the job.
- Completing the invoice later does not duplicate or erase prior salary payments.
- Monthly salary totals include payments by payment date regardless of invoice status.
- The UI explains that employee pay can be recorded before the customer pays.

## Task 7: Make Past Job Lookup Fast and Useful

Priority: P1
Recommended model: `gpt-5` for search/workflow design, `gpt-5-codex` for implementation
Files: `components/pages/invoice-history.tsx`, `components/modals/invoice-detail-modal.tsx`, `components/pages/customer-contacts.tsx`, `lib/customer-contacts.ts`, `lib/translations.ts`, possibly `lib/db.ts`

Context:
- Past invoices are past job records.
- The owner sometimes needs to quickly view what was done on an earlier job for the same customer or vehicle.
- Search should work for customer name, phone, plate number, vehicle make/model/year, invoice number, and item/labor descriptions where practical.

Implementation notes:
- Improve Invoice History so it feels like "Past Jobs" as well as invoices.
- Add or improve search/filter fields for:
  - Customer
  - Phone
  - Plate number
  - Vehicle
  - Invoice number
  - Date range
  - Paid/completed status
  - Work/item description if feasible
- Invoice detail view should show a job-oriented summary:
  - Customer and vehicle
  - Dates opened/completed/paid
  - Labor
  - Parts/materials
  - Notes
  - Employee payments linked to the job, if available
- Customer Contacts should make it easy to open a customer's past jobs before starting a new one.
- Consider renaming or adding subtitle copy: "Invoice History / Past Jobs".

Acceptance checks:
- The owner can find a previous job by plate number or customer name.
- The owner can open a past job and see what labor, parts, and notes were recorded.
- Past job lookup does not require knowing the invoice number.
- The flow supports starting a new invoice from a past customer/vehicle after reviewing history.

## Task 8: Fix Revenue Tracking Yearly Totals and Chart Semantics

Priority: P1
Recommended model: `gpt-5` for finance logic, `gpt-5-codex` for implementation
Files: `components/pages/revenue-tracking.tsx`, `lib/db.ts`
Breaking change: Calculation/reporting change. This may change displayed totals without changing stored records, so release notes must explain the new meanings.

Context:
- Monthly summaries in `lib/db.ts:406` compute `revenue = salesRevenue + additionalIncome` and `costs = productCosts + additionalExpenses + salaryPayments`.
- `components/pages/revenue-tracking.tsx:90` recomputes yearly stats manually, but `totalRevenue` is set to sales only at `components/pages/revenue-tracking.tsx:95`.
- Average invoice value at `components/pages/revenue-tracking.tsx:108` uses sales revenue only, while labels elsewhere imply revenue includes additional income.
- The pie chart at `components/pages/revenue-tracking.tsx:310` is labeled `revenueBreakdown`, but displays costs, expenses, salaries, and profit, not revenue composition. It also renders only three `<Cell>` colors for four possible slices.
- Shop workflow note: employee salary costs can happen before a job is complete, but invoice sales revenue should count when the invoice/job is paid or completed.

Implementation notes:
- Reuse monthly `summary.revenue`, `summary.costs`, and `summary.profit` instead of recomputing with different semantics.
- Rename labels or split metrics clearly:
  - Sales revenue
  - Additional income
  - Total revenue
  - Product costs
  - Other expenses
  - Salary payments
  - Total costs
  - Profit
- Average invoice value should use sales revenue only and be labeled that way, or use total revenue only if the business expects extra income in the average.
- Fix pie chart data and colors so the title matches the contents and all slices have colors.
- Make timing clear in reports: salary costs are based on payment date; invoice revenue is based on paid/completed invoices.

Acceptance checks:
- Yearly cards equal the sum of the monthly table columns.
- Profit margin denominator is explicitly total revenue.
- Chart legends and labels match the actual data.
- Reports do not hide salary costs just because the linked job is still active.

## Task 9: Align Salaries Summary Cards With Selected Month

Priority: P1
Recommended model: `gpt-5-codex`
Files: `components/pages/salaries.tsx`, `lib/translations.ts`

Context:
- The salaries page has a `selectedMonth` state at `components/pages/salaries.tsx:136`.
- The monthly employee table uses that selected month at `components/pages/salaries.tsx:161`.
- The top card labeled `thisMonth` calculates against the current system month at `components/pages/salaries.tsx:590`, not the selected month.
- Salary payments may be linked to active unfinished jobs, so the date on the payment should drive monthly totals.

Implementation notes:
- Either change the card to always reflect the selected month, or rename it to make clear it is the current calendar month.
- Preferred: derive the card from `selectedMonth` and label it with the selected month.
- Use `formatMonth` or add a translation-safe month label.
- Do not filter monthly salary totals by invoice completion status.

Acceptance checks:
- Changing the month picker updates the top monthly total card and the monthly employee table consistently.
- The label no longer implies a different month than the data shown.
- Salary payments linked to active jobs still appear in the selected month's totals.

## Task 10: Add Versioned Upgrade Migrations and Automatic Pre-Update Backup

Priority: P0
Recommended model: `gpt-5` for migration design and data-safety review, `gpt-5-codex` for implementation
Files: `public/electron.js`, `lib/db.ts`, `components/pages/app-settings.tsx`, `scripts/validate-production.js`, new migration/test fixtures if needed
Breaking change: Potential breaking change. This task is specifically to prevent data loss when future breaking changes are introduced.

Context:
- The desktop app stores the live shop database at Electron `userData` as `shopflow.db`, with legacy fallback from `mechanic-shop.db`.
- Startup currently uses `CREATE TABLE IF NOT EXISTS`, `ensureColumnExists`, and direct data updates in `public/electron.js`.
- There is no explicit schema version table, migration ledger, or owner-visible record of which migrations ran.
- `data:export` writes `version: '1.3.0'`, while `package.json` currently reports `1.2.3`, so app version and backup format version can drift.
- Existing startup data updates normalize old invoice statuses to `paid` and backfill salary employees. These need to become tracked migrations before more schema/data changes are added.

Implementation notes:
- Add a small `app_metadata` or `schema_migrations` table with current schema version, app version last opened, migration id, migration timestamp, and success/failure details.
- Before running any schema or data migration, automatically copy `shopflow.db` and managed asset folders such as `logos/` and `invoices/` into a timestamped folder under Electron `userData`, for example `backups/pre-update/2026-06-04-1530-from-1.2.3-to-1.2.4/`.
- Use transactions for database migrations. If a migration fails, leave the original database usable and show a plain-language error with the backup location.
- Make every migration idempotent. Checks should be based on schema state and migration ledger entries, not only app version strings.
- Convert existing startup changes into named migrations:
  - Add missing invoice item `cost_price`.
  - Add vehicle/customer/due date/language/paid/completed invoice columns.
  - Add salary `employee_id` and `invoice_id`.
  - Create indexes.
  - Backfill employees from salary payments.
  - Backfill invoice item cost prices.
  - Normalize legacy invoice statuses without changing active draft jobs.
- Keep imported/exported backup file schema version separate from package/app version, but include both in exported data.
- Add a developer migration checklist that every future schema task must fill in:
  - old version tested
  - new version tested
  - pre-update backup verified
  - migration rerun verified
  - rollback/manual restore path documented
- Add fixture-based smoke tests or scripts that copy an older database, run migrations, and verify record counts and key relationships.

Acceptance checks:
- Updating the app automatically creates a timestamped backup before database or asset changes.
- Existing invoices, draft/active jobs, past jobs, invoice items, products, salary payments, employees, business settings, logo, and saved PDFs survive migration.
- Running the app twice after an update does not duplicate rows or reapply one-time transformations incorrectly.
- A failed migration does not leave the owner with an empty or half-mutated database.
- Export files include both app version and backup schema version, and import still accepts older supported backups.
- Release notes can identify whether a version has no data migration, a safe additive migration, or a breaking workflow/data migration.

## Task 11: Wrap Data Import in a Single Transaction and Validate Schema Before Mutation

Priority: P0
Recommended model: `gpt-5-codex`
Files: `public/electron.js`, `components/pages/app-settings.tsx`, `components/pages/data-management.tsx`
Breaking change: Potential breaking change. Import/export changes can affect whether old backup files restore correctly.

Context:
- `public/electron.js:1312` parses and imports JSON, but the clear and insert operations are not wrapped in one transaction.
- If any insert fails after `shouldClear`, the user can be left with partially deleted or partially imported data.
- Asset restore happens before DB inserts at `public/electron.js:1337`, so file writes can also get ahead of DB success.

Implementation notes:
- Validate export `version`, table arrays, required columns, and ID relationships before clearing or inserting.
- Accept older supported backup formats through explicit import migrations instead of rejecting files because their shape is old.
- Show the owner a plain confirmation before "replace all data" that says an automatic backup will be made first.
- Run DB mutations inside one `better-sqlite3` transaction.
- Use temporary asset paths or a staging directory, then commit/replace assets only after the DB transaction succeeds.
- Return structured import errors with a user-safe message.
- Include migration notes for backup file versions so old exports from prior app versions remain recoverable.

Acceptance checks:
- Invalid JSON or invalid rows do not mutate existing data.
- A simulated mid-import failure rolls back all DB changes.
- Import success restores logo and invoice PDFs without orphaning assets on failure.
- Backup files from every supported prior export version still import into the latest version without losing invoices, products, salary payments, business settings, or assets.

## Task 12: Deduplicate Data Management UI and Logic

Priority: P2
Recommended model: `gpt-5-codex`
Files: `components/pages/app-settings.tsx`, `components/pages/data-management.tsx`, `app/page.tsx`, `components/sidebar.tsx`

Context:
- Data import/export code exists in `components/pages/data-management.tsx:18` and again in `components/pages/app-settings.tsx:147`.
- The main route union in `app/page.tsx` no longer includes `data-management`, and sidebar does not expose that page, but `components/pages/data-management.tsx` still exists.
- The production validation script still expects a `data-management` route.

Implementation notes:
- Pick one product decision:
  - Keep Data Management inside App Settings and delete/archive the standalone page.
  - Or restore Data Management as a first-class route using the existing page.
- If keeping both, extract shared import/export controls into one shadcn-based component.
- Update navigation and scripts to match the product decision.

Acceptance checks:
- There is one clear user path for backup/restore, or two intentionally different paths sharing one implementation.
- `node scripts/validate-production.js` no longer checks for stale routes.

## Task 13: Add Guided First-Run Training and Daily Workflow Help

Priority: P0
Recommended model: `gpt-5` for UX copy and workflow design, `gpt-5-codex` for implementation
Files: `components/pages/dashboard.tsx`, `components/pages/business-settings.tsx`, `components/pages/inventory.tsx`, `components/pages/invoice-creator.tsx`, `components/pages/active-invoices.tsx`, `components/pages/app-settings.tsx`, `lib/translations.ts`

Context:
- The primary user is a non-technical mechanic shop owner using this offline on a desktop.
- The dashboard already has quick-start content, but the app still needs to actively guide the user through first setup and daily operations.
- The most important daily flow is: customer drops off vehicle, start invoice/job, update it across days or weeks, optionally record employee pay, complete/mark paid after customer pays, later find the past job if the customer returns, back up data.

Implementation notes:
- Add a first-run checklist with clear completion states:
  - Add shop name and contact details.
  - Add a few common inventory items.
  - Create first active job/invoice at vehicle drop-off.
  - Find and update active jobs.
  - Record employee pay for a job when needed.
  - Complete and print an invoice after the customer pays.
  - Find a past job by customer, vehicle, plate number, or invoice.
  - Export a backup.
- Keep language concrete and non-technical. Prefer "Shop details", "Items you use", "Jobs in progress", "Finished invoices", and "Backup" over abstract labels.
- Add contextual helper text and empty states where the user can get stuck. Examples:
  - Inventory empty state: "Add items here when you want the app to track stock. You can still invoice items even if stock is not updated yet."
  - Active invoices empty state: "Jobs in progress will appear here after you start an invoice."
  - Invoice edit page: "Keep updating this job until the work is done and the customer has paid."
  - Salary page: "You can pay workers for a job even before the invoice is completed."
  - Backup section: "Do this at the end of the day or before moving computers."
- Consider a lightweight "Training Mode" using sample/demo data that can be cleared, or a guided walkthrough that points to the next action without adding fake business records.
- Persist checklist completion locally so the app does not keep teaching the same basics forever.

Acceptance checks:
- A first-time user can understand the recommended setup path from the Dashboard without external docs.
- Empty pages explain what the page is for and what action to take next.
- Help text explicitly says inventory does not have to be perfect before creating an invoice.
- Help text explains that active jobs can stay open for days or weeks.
- Help text explains that worker pay can be recorded before a customer pays.
- All new copy is available in English and Tagalog.

## Task 14: Simplify Navigation Around the Shop's Real Workflow

Priority: P1
Recommended model: `gpt-5` for information architecture, `gpt-5-codex` for implementation
Files: `components/sidebar.tsx`, `app/page.tsx`, `lib/translations.ts`, page headers

Context:
- The sidebar currently exposes many sections at once.
- A non-technical shop owner needs obvious next steps, not a software-admin menu.
- The app is offline and single-user, so navigation should prioritize daily shop tasks over technical settings.

Implementation notes:
- Group navigation into plain workflow sections:
  - Today: Dashboard, Start Job / Create Invoice, Jobs in Progress.
  - Records: Past Jobs / Invoice History, Customer Contacts.
  - Shop Data: Inventory, Salaries, Expenses & Income, Revenue Tracking.
  - Setup: Business Settings, App Settings / Backup.
- Consider shorter labels if testing shows the sidebar feels crowded.
- Keep icons, but make the text clear enough that icons are not required.
- Put backup/data management somewhere the owner can find it, with wording like "Backup & Transfer".

Acceptance checks:
- A first-time user can identify where to start a job at vehicle drop-off, continue a job, pay workers, find past jobs, update items, and make a backup.
- Settings and backup are not hidden behind developer-sounding names.
- Sidebar remains usable at desktop size and adapts with Task 15 for small screens.

## Task 15: Make App Shell Responsive on Small Viewports

Priority: P1
Recommended model: `gpt-5-codex`
Files: `app/page.tsx`, `components/sidebar.tsx`, likely `components/ui/sidebar.tsx`, page wrappers

Context:
- App shell uses `flex h-screen` at `app/page.tsx:233`.
- Sidebar is fixed `w-64 h-screen` with no mobile drawer/collapse behavior at `components/sidebar.tsx:58`.
- On narrow screens the fixed sidebar consumes most of the viewport and page tables rely on horizontal scrolling.
- Even if the main deployment is a desktop, responsive behavior matters for small laptop screens, split-screen use, and remote support.

Implementation notes:
- Prefer the existing shadcn sidebar/sheet components over custom mobile navigation.
- Add a desktop sidebar and mobile sheet or bottom navigation trigger.
- Use `min-h-dvh`, `min-w-0`, and responsive grid/flex wrappers so content can shrink.
- Ensure table pages remain usable: search/filter controls should wrap cleanly and horizontal scroll should be confined to the table, not the whole app.

Acceptance checks:
- At 375px width, navigation is reachable and main content is not squeezed off-screen by the sidebar.
- At tablet widths, cards and controls wrap without overlapping.
- At desktop widths, the current sidebar behavior remains stable.

## Task 16: Replace Fixed 12-Column Invoice Item Rows With Responsive Layout

Priority: P1
Recommended model: `gpt-5-codex`
Files: `components/pages/invoice-creator.tsx`

Context:
- Invoice item editor uses fixed `grid-cols-12` rows at `components/pages/invoice-creator.tsx:1022` and `components/pages/invoice-creator.tsx:1037`.
- Quantity, unit price, amount, and delete controls are cramped on small screens.
- The invoice editor uses custom styling instead of shadcn form/table primitives.

Implementation notes:
- Use Tailwind responsive grid/flex: stacked card layout on mobile, compact table-like grid on desktop.
- Use shadcn `Input`, `Button`, `Select` where possible instead of raw `select`/`button`.
- Keep amount and remove actions stable so typing does not shift layout.
- Preserve labor/product separation.

Acceptance checks:
- 320px and 375px widths can edit product, description, quantity, and price without horizontal clipping.
- Desktop invoice editor still scans like a table.
- Keyboard tab order remains logical.

## Task 17: Modernize Table-Heavy Pages for Responsive Use

Priority: P2
Recommended model: `gpt-5-codex`
Files: `components/pages/inventory.tsx`, `components/pages/invoice-history.tsx`, `components/pages/customer-contacts.tsx`, `components/pages/revenue-tracking.tsx`, `components/pages/salaries.tsx`, `components/pages/expenses-income.tsx`

Context:
- Several pages use wide tables with hard `min-w` values:
  - Customer contacts: `min-w-[1120px]`
  - Invoice history: `min-w-[1100px]`
  - Revenue tracking: `min-w-[1180px]`
  - Salaries history: `min-w-[980px]`
  - Inventory: `min-w-[980px]`
- Horizontal table scroll is acceptable for dense desktop data, but the current mobile experience is mostly a scaled-down desktop table.

Implementation notes:
- Prefer shadcn table components for consistent table styling.
- Add mobile card/list summaries below `md` where dense tables are hard to use.
- Keep desktop tables for power use.
- Make filter/search bars responsive with `grid`, `flex-wrap`, `min-w-0`, and stable heights.

Acceptance checks:
- Each listed page has a usable mobile presentation with no app-wide horizontal scroll.
- Desktop table sorting remains available.
- Filters and actions remain reachable at 375px and 768px widths.

## Task 18: Improve Translation Quality and Clean Stale Keys

Priority: P2
Recommended model: `gpt-5-mini` for audit, `gpt-5` for final Tagalog wording review
Files: `lib/translations.ts`, `lib/pdf-generator.ts`, invoice PDF/print utilities

Context:
- Automated key coverage found 0 missing used keys, but 43 unused English keys.
- Tagalog strings include many English or mixed labels, for example `phone`, `email`, `status`, `markAsPaid`, `download`, `enable`, `preview`, and multiple instruction labels.
- `versionLabel` is stale at `lib/translations.ts:21` and `lib/translations.ts:539` compared with `package.json:3`.
- `lib/pdf-generator.ts:93` and nearby lines hard-code English invoice labels and a USD-style currency fallback. It appears legacy, but if still used it bypasses translations.

Implementation notes:
- Decide whether unused translation keys are intentionally reserved or should be removed.
- Update Tagalog copy with consistent tone and business terminology.
- Replace hard-coded invoice labels in any still-used PDF path with `buildInvoicePdfLabels`.
- Derive visible app version from Electron/package version instead of hard-coding `versionLabel`, or remove the key if unused.

Acceptance checks:
- Translation audit still reports 0 missing used keys.
- Stale version labels are removed or derived from actual app version.
- Invoice PDFs/print output do not use untranslated hard-coded labels in active code paths.

## Task 19: Type the Electron API, Database Rows, and Shared Domain Models

Priority: P2
Recommended model: `gpt-5-codex`
Files: `lib/electron-api.ts`, `lib/db.ts`, `components/pages/*`, `components/modals/*`, `lib/invoice-pdf.ts`, `lib/invoice-print-html.ts`

Context:
- Many core APIs use `any`, including safe DB wrappers at `lib/electron-api.ts:36`, file save data at `lib/electron-api.ts:83`, PDF generation at `lib/electron-api.ts:151`, and window API types in `lib/db.ts`.
- Page components also use local `any` for invoice rows, settings, and chart cards.
- TypeScript passes, but the broad `any` usage hides schema drift between Electron IPC, SQLite rows, and renderer code.

Implementation notes:
- Create shared interfaces for `Product`, `Invoice`, `InvoiceItem`, `BusinessSettings`, `Employee`, `SalaryPayment`, `Expense`, and import/export payloads.
- Type `window.electronAPI` in one global declaration rather than duplicating broad shapes.
- Add generic result types to `db.query<T>()` and `db.get<T>()`.
- Convert high-risk pages first: invoices, revenue tracking, import/export.

Acceptance checks:
- TypeScript strict mode still passes.
- New code does not need `as any` for common DB reads.
- At least invoice and import/export paths have typed payloads.

## Task 20: Harden Database IPC Instead of Exposing Raw SQL From Renderer

Priority: P3
Recommended model: `gpt-5` for security/design, `gpt-5-codex` for implementation
Files: `public/preload.js`, `public/electron.js`, `lib/db.ts`, all renderer DB call sites

Context:
- `public/preload.js` exposes `database.query`, `database.get`, `database.run`, and `database.exec` directly to the renderer.
- `public/electron.js` executes arbitrary SQL passed over IPC.
- This is convenient but a high-trust boundary for an Electron app; any renderer compromise gets broad local DB mutation capability.
- Because this is an offline single-user desktop app, this is not a blocker ahead of user-facing training, data safety, and invoice reliability. Treat it as long-term hardening.

Implementation notes:
- Introduce intent-based IPC methods for common operations: products, invoices, settings, finance, data import/export.
- Keep a temporary compatibility layer only while migrating pages.
- Validate inputs in the main process before DB mutation.
- Restrict or remove `database:exec` from renderer-facing API.

Acceptance checks:
- Renderer no longer needs raw SQL for the highest-risk flows: invoice save, import/export, product stock updates.
- Main process validates payload shapes before writes.
- Existing user workflows remain functional.

## Task 21: Refresh Production Validation and Release Documentation

Priority: P2
Recommended model: `gpt-5-codex`
Files: `scripts/validate-production.js`, `scripts/production-checklist.js`, `scripts/completion-summary.js`, `README.md`, `INSTALL_GUIDE.md`
Breaking change: No direct runtime breaking change, but this task must document every breaking or migration-requiring release before publishing.

Context:
- `node scripts/validate-production.js` currently fails because it expects `data-management` inside `app/page.tsx` at `scripts/validate-production.js:50`.
- `scripts/production-checklist.js` says `ShopFlow System v1.0` and `READY FOR PRODUCTION`, which is stale against `package.json:3`.
- README mentions workflows and production notes that may not match the current navigation after App Settings absorbed Data Management.

Implementation notes:
- Replace brittle string-includes checks with behavior-oriented checks where possible.
- Align route expectations with the product decision from Task 12.
- Update version references to derive from `package.json`.
- Avoid “ready to ship” claims unless the script actually validates build, typecheck, lint, and key smoke paths.
- Add a release checklist section for:
  - Breaking change: Yes/No
  - Data migration: None/Additive/Transforming
  - Automatic backup created and verified
  - Old database fixture tested
  - Manual restore steps documented in non-technical language

Acceptance checks:
- `node scripts/validate-production.js` passes for the current app structure.
- The script fails when a required page/component is actually missing.
- README and install guide match current UI names and release constraints.
- Release documentation tells the owner what will happen to existing data during an update and where the automatic backup is stored.

## Task 22: Improve Business Settings Address Model

Priority: P2
Recommended model: `gpt-5-codex`
Files: `components/pages/business-settings.tsx`, `public/electron.js`, invoice PDF/print utilities, `lib/translations.ts`
Breaking change: Potential breaking change. Address field changes must preserve existing `address`, `city`, and `postal_code` values.

Context:
- Business settings load combines `address`, `city`, and `postal_code` into one line at `components/pages/business-settings.tsx:70`.
- Save writes the entire address into `address` and clears `city` and `postal_code` at `components/pages/business-settings.tsx:201`.
- Existing DB schema still has separate columns.

Implementation notes:
- Decide whether the app wants one address field or separate address/city/postal code fields.
- If one field, migrate code and import/export naming to make that clear.
- If separate fields, restore separate inputs and update invoice rendering to compose them.
- Keep existing saved data readable.
- Include a migration that copies legacy separate fields into the chosen model without deleting the originals until a verified backup and release note exist.

Acceptance checks:
- Saving business settings no longer silently discards structured city/postal data unless that is the documented migration.
- Invoice headers render the business address consistently.
- Import/export preserves the selected address model.

## Task 23: Add Focused Regression Tests or Scripted Smoke Checks

Priority: P2
Recommended model: `gpt-5-codex`
Files: new test setup files, `package.json`, high-risk utility modules

Context:
- There are no automated tests visible in the repo.
- High-risk behavior includes invoice stock updates, invoice number generation, monthly financial summaries, recurring expense processing, salary totals, import/export, and translation coverage.
- Upgrade safety is also high risk because the owner may have months or years of local-only data on one desktop.

Implementation notes:
- Add a lightweight test runner that works with the current stack, such as Vitest for pure utilities and DB-adjacent logic.
- Start with pure functions and mocked DB calls before full Electron integration.
- Add a script for translation key coverage similar to the review pass.
- Add fixture-based migration smoke checks for older SQLite databases and older exported JSON files.
- Keep tests scoped and fast.

Acceptance checks:
- New `pnpm test` or `pnpm test:unit` script runs locally without Electron.
- Tests cover invoice number generation, financial summary math, recurring dates, and translation key coverage.
- Tests or smoke scripts verify that an old database upgrades without losing invoices, active jobs, products, salary payments, settings, logo paths, or PDF asset links.
- Existing `pnpm typecheck` and `pnpm exec next build --webpack` still pass.
