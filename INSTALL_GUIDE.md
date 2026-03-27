# Install Guide

This app is made for shop owners who want a simple desktop program that works even without the internet.

## For Shop Owners

### Windows
1. Open the latest release page:
   `https://github.com/Dforrunner/talyer/releases/latest`
2. Download the installer file:
   `Mechanic-Shop-Invoicing-<version>-x64-nsis.exe`
3. Double-click the installer.
4. Click through the install steps.
5. Open `Mechanic Shop Invoicing` from the desktop or Start Menu.

Recommended:
- Use the installer version, not the portable version, if you want in-app updates to work.

### macOS
1. Open the latest release page:
   `https://github.com/Dforrunner/talyer/releases/latest`
2. Download one of these files:
   - `Mechanic-Shop-Invoicing-<version>-arm64-mac.dmg` for Apple Silicon Macs
   - `Mechanic-Shop-Invoicing-<version>-x64-mac.dmg` for Intel Macs
3. Open the `.dmg` file.
4. Drag `Mechanic Shop Invoicing` into `Applications`.
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
1. Open `Business Settings`.
2. Go to the `App Updates` section.
3. Click `Check for Updates`.
4. If an update is available, click `Download Update`.
5. When it finishes, click `Install and Restart`.

## Data Safety
- Your data stays on your own computer.
- The app does not require an account or password.
- Use `Data Management` to export a backup regularly.

## For the App Publisher

### Create a Release
1. Update the version in `package.json`.
2. Commit the changes.
3. Create a tag:
   ```bash
   git tag v1.0.1
   git push origin main --tags
   ```
4. GitHub Actions will build the app and publish the release files.

### Manual Local Release
If you want to publish directly from your own machine, set a GitHub token first:

```bash
export GITHUB_TOKEN=your_github_token
pnpm run release
```

