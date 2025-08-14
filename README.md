# Claude Code Changelog Notification App

Desktop notification application that monitors the Claude Code CHANGELOG.md file for updates and displays notifications when new versions are released.

## Features

- 🔔 Desktop notifications for new Claude Code releases
- ⏰ Configurable polling intervals (5 minutes to 2 hours)
- 🔊 Optional notification sounds
- 📋 System tray integration
- ⚙️ Settings panel for customization
- 🌐 Click notifications to open GitHub changelog

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cc-changelog-notification
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. (Optional) Set up GitHub token for higher rate limits:
   ```bash
   cp .env.example .env
   # Edit .env and add your GitHub Personal Access Token
   ```

## Development

1. Build the TypeScript code:
   ```bash
   pnpm run build
   ```

2. Run the application:
   ```bash
   pnpm run dev
   ```

## Usage

1. Start the application - it will appear in your system tray
2. Right-click the tray icon to access the context menu:
   - **Check Now**: Manually check for updates
   - **Test Notification**: Test the notification system
   - **Settings**: Configure polling interval and notification preferences
   - **Quit**: Exit the application

## Configuration

The app stores its configuration in your system's user data directory:
- **macOS**: `~/Library/Application Support/cc-changelog-notification/config.json`
- **Windows**: `%APPDATA%\\cc-changelog-notification\\config.json`
- **Linux**: `~/.config/cc-changelog-notification/config.json`

### Configuration Options

- `notification.enabled`: Enable/disable notifications
- `notification.soundEnabled`: Enable/disable notification sounds
- `notification.pollInterval`: Check interval in minutes (5-120)

## GitHub Token (Optional)

To avoid GitHub API rate limits, you can provide a Personal Access Token:

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Create a new token with `public_repo` permission
3. Set the `GITHUB_TOKEN` environment variable or add it to a `.env` file

## Building for Distribution

Build the application for your platform:

```bash
# Build only
pnpm run build

# Package for current platform
pnpm run pack

# Build distributable packages
pnpm run dist
```

## Requirements

- Node.js 18+
- pnpm package manager

## Monitored Repository

This app monitors: [anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)

## License

MIT