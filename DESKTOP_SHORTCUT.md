# Desktop Shortcut Setup

## Automatic Desktop Shortcut Creation

When you run the Mechanic Shop Invoicing application for the first time, it automatically creates a desktop shortcut so you can easily launch it in the future.

### What Happens

1. **First Launch**: The application detects this is the first run
2. **Automatic Creation**: A desktop shortcut is created on your Desktop
3. **Easy Access**: You can now double-click the shortcut to launch the app anytime

## Platform-Specific Details

### Windows
- **Shortcut Name**: "Mechanic Shop Invoicing.lnk"
- **Location**: Desktop
- **How to Use**: Simply double-click the icon to launch the application
- **Additional Ways to Access**:
  - Pin to Start Menu
  - Pin to Taskbar
  - Use Windows Search to find "Mechanic Shop Invoicing"

### macOS
- **Shortcut Name**: "Mechanic Shop Invoicing"
- **Location**: Desktop
- **How to Use**: Double-click to launch
- **Note**: The app bundle is linked from the Applications folder
- **Additional Ways to Access**:
  - Open Applications folder
  - Use Spotlight Search (Cmd+Space, then type "Mechanic Shop")
  - Drag app to Dock for quick access

### Linux
- **Shortcut Name**: "Mechanic-Shop-Invoicing.desktop"
- **Location**: Desktop
- **How to Use**: Double-click to launch (may need to allow execution on first click)
- **Additional Ways to Access**:
  - Add to applications menu
  - Pin to taskbar
  - Use application launcher

## Manual Shortcut Creation

If the automatic shortcut creation didn't work for some reason, you can manually create a shortcut:

### Windows
1. Right-click on your Desktop
2. Select "New" → "Shortcut"
3. Click "Browse"
4. Navigate to where the application is installed
5. Select the executable file
6. Click "Next" and name it "Mechanic Shop Invoicing"
7. Click "Finish"

### macOS
1. Open Finder
2. Navigate to Applications folder
3. Find "Mechanic Shop Invoicing"
4. Drag it to your Desktop (hold Option key to create alias)

### Linux
1. Right-click on Desktop
2. Create New → Link or Launcher
3. Set the command to the application path
4. Name it "Mechanic Shop Invoicing"

## Troubleshooting

### Shortcut Doesn't Appear
- Check if Desktop folder exists and is accessible
- Try running as Administrator (Windows)
- Manually create the shortcut using the instructions above

### Permission Issues (Linux)
- Run: `chmod +x ~/Desktop/Mechanic-Shop-Invoicing.desktop`
- Then try double-clicking the shortcut

### Windows PowerShell Issues
- Make sure PowerShell is enabled on your system
- You may need to run the application as Administrator once

## First-Run Only

The desktop shortcut is only created automatically on the first run. Subsequent launches detect that the shortcut has been created and skip this process. If you accidentally delete the shortcut, you can:

1. Delete the file: `AppData/Local/mechanic-shop-invoicing/.shortcut_created` (Windows)
2. Restart the application to recreate the shortcut

Or simply create a new shortcut manually using the instructions above.
