# Claude Code Changelog Notification Tool

Notification tool for Claude Code CHANGELOG.md updates. Monitor anthropics/claude-code releases and get instant notifications when new versions are available.

## Features

- 🔔 Desktop notifications for new Claude Code releases
- ⏰ Configurable polling intervals (5 minutes to 2 hours)
- 🔊 Optional notification sounds
- 📋 System tray integration
- ⚙️ Settings panel for customization
- 🌐 Click notifications to open GitHub changelog

## Status

⚠️ **Development Version** - This is currently in development. Packaged releases (`.app`, `.exe`) will be available in the future.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/camoneart/cc-changelog-notification.git
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

## GitHub Token (Optional but Recommended)

While the tool works without a token (60 API calls/hour), setting up a GitHub token is recommended for stability:

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Create a new token with `public_repo` permission
3. Set the `GITHUB_TOKEN` environment variable or add it to a `.env` file

## Building for Distribution

⚠️ **Note**: Package commands (`pack`, `dist`) are not yet configured. Coming soon!

## Requirements

- Node.js 18+
- pnpm package manager

## Monitored Repository

This app monitors: [Claude Code CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
