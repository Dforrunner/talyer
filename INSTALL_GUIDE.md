# Install Guide

ShopFlow is made for shop owners who want a simple desktop program that works even without the internet.

## For Shop Owners

### Windows
1. Open the latest release page:
   `https://github.com/Dforrunner/talyer/releases/latest`
2. Download the installer file:
   `ShopFlow-<version>-x64-nsis.exe`
3. Double-click the installer.
4. Click through the install steps.
5. Open `ShopFlow` from the desktop or Start Menu.

Recommended:
- Use the installer version, not the portable version, if you want in-app updates to work.

### macOS
1. Open the latest release page:
   `https://github.com/Dforrunner/talyer/releases/latest`
2. Download one of these files:
   - `ShopFlow-<version>-arm64-mac.dmg` for Apple Silicon Macs
   - `ShopFlow-<version>-x64-mac.dmg` for Intel Macs
3. Open the `.dmg` file.
4. Drag `ShopFlow` into `Applications`.
5. Open the app from `Applications`.

Note:
- If macOS shows a warning the first time, open `System Settings > Privacy & Security` and allow the app to run.
- In-app updates work best from the installed app in `Applications`.

## First-Time Setup
1. Open `Business Settings`.
2. Enter your shop name, phone number, address, and logo.
3. Add products in `Inventory`.
4. Start your first job in `Create Invoice`.
5. Save unfinished work in `Active Invoices`.

## How To Update
1. Open `App Settings`.
2. Go to the `App Updates` section.
3. Click `Check for Updates`.
4. If an update is available, click `Download Update`.
5. When it finishes, click `Install and Restart`.

Before updating:
- Read the release notes.
- Look for `Breaking change` and `Data migration` notes.
- If the release says a data migration will run, it must also say that an `Automatic backup` will be created before the app changes existing data.

## Data Safety
- Your data stays on your own computer.
- The app does not require an account or password.
- Use `App Settings > Data Management` to export a backup regularly.
- The main database is named `shopflow.db` in the app data folder.
- Older installs may have used `mechanic-shop.db`; the app can move that legacy database name into the current `shopflow.db` path.
- Logo files and saved invoice PDFs are managed app data and must be preserved during updates.

### Backup And Transfer
1. Open `App Settings`.
2. Find `Data Management`.
3. Click `Export All Data`.
4. Keep the JSON backup file somewhere safe.
5. To restore on another computer, install ShopFlow, open `App Settings > Data Management`, and click `Import Data From File`.

Import options:
- Leave `Replace all existing data` unchecked to merge the backup into the current app data.
- Check `Replace all existing data` only when you want the backup file to become the complete data set on that computer.

Manual restore:
- If a release note says a migration created an automatic backup, keep the backup folder path from the release or error message.
- A technical helper can restore by closing ShopFlow, replacing the current `shopflow.db` with the backed-up `shopflow.db`, and restoring the backed-up `logos/` and `invoices/` folders if they exist.
- Do not delete the backup folder until the app opens and the invoices, products, employee payments, settings, logo, and PDFs have been checked.

## For the App Publisher

### Create a Release
1. Update the version in `package.json`.
2. Add release notes with:
   - `Breaking change: No`, `Workflow/training change`, `Potential breaking change`, or `Breaking change: Yes`
   - `Data migration: None`, `Additive`, or `Transforming`
   - `Automatic backup` status
   - Manual restore steps when a migration is involved
3. Run the release checks:
   ```bash
   pnpm typecheck
   pnpm exec next build --webpack
   node scripts/validate-production.js
   node scripts/smoke-production-docs.js
   node scripts/smoke-translation-coverage.js
   ```
4. For schema or import/export changes, verify an old database fixture and old backup JSON before tagging.
5. Commit the changes.
6. Create a tag:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```
7. GitHub Actions will build the app and publish the release files.

### Manual Local Release
If you want to publish directly from your own machine, set a GitHub token first:

```bash
export GITHUB_TOKEN=your_github_token
pnpm run release
```
