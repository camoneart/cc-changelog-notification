import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { GitHubService } from '../services/GitHubService';
import { NotificationService } from '../services/NotificationService';
import { ConfigService } from '../services/ConfigService';
import { AppConfig } from '../types';

class ChangelogMonitor {
  private githubService!: GitHubService;
  private notificationService!: NotificationService;
  private configService!: ConfigService;
  private config!: AppConfig;
  private tray: Tray | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    this.configService = new ConfigService();
    this.config = await this.configService.loadConfig();
    
    this.githubService = new GitHubService(
      this.config.github.owner,
      this.config.github.repo,
      this.config.github.filePath,
      process.env.GITHUB_TOKEN
    );
    
    this.notificationService = new NotificationService(this.config.notification.soundEnabled);
    
    this.createTray();
    this.setupIPC();
    this.startPolling();
  }

  private createTray(): void {
    // Create a simple icon for the tray (you would replace this with an actual icon file)
    const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQSG1sLwcJCG1sLG0uxsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ==');
    
    this.tray = new Tray(icon);
    this.tray.setToolTip('Claude Code Changelog Monitor');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Check Now',
        click: () => this.checkForUpdates(),
      },
      {
        label: 'Test Notification',
        click: () => this.notificationService.showTestNotification(),
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.openSettings(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  private setupIPC(): void {
    ipcMain.handle('get-config', () => {
      return this.config;
    });

    ipcMain.handle('update-config', async (_, updates) => {
      this.config = await this.configService.updateConfig(updates);
      this.notificationService.setSoundEnabled(this.config.notification.soundEnabled);
      this.restartPolling();
      return this.config;
    });

    ipcMain.handle('test-notification', () => {
      this.notificationService.showTestNotification();
    });

    ipcMain.handle('check-now', () => {
      this.checkForUpdates();
    });
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const hasChanges = await this.githubService.checkForChanges();
      
      if (hasChanges && this.config.notification.enabled) {
        const latestVersion = await this.githubService.getLatestVersion();
        
        if (latestVersion) {
          const githubUrl = this.githubService.getCommitUrl();
          await this.notificationService.showChangelogNotification(latestVersion, githubUrl);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      await this.notificationService.showErrorNotification(
        'Failed to check for updates. Please check your internet connection.'
      );
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    const intervalMs = this.config.notification.pollInterval * 60 * 1000; // Convert minutes to milliseconds
    
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    // Check immediately on start
    setTimeout(() => this.checkForUpdates(), 5000); // Wait 5 seconds after startup
  }

  private restartPolling(): void {
    this.startPolling();
  }

  private openSettings(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 400,
      height: 500,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../renderer/preload.js'),
      },
      title: 'Claude Code Notifier Settings',
      resizable: false,
      show: false,
    });

    // For now, we'll create a simple settings HTML file
    const settingsHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Settings</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            .setting { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: 500; }
            input, select { width: 100%; padding: 8px; margin-bottom: 10px; }
            button { padding: 10px 20px; margin: 5px; }
            .buttons { text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h2>Claude Code Notifier Settings</h2>
          <div class="setting">
            <label>
              <input type="checkbox" id="enabled"> Enable notifications
            </label>
          </div>
          <div class="setting">
            <label>
              <input type="checkbox" id="soundEnabled"> Enable sound
            </label>
          </div>
          <div class="setting">
            <label for="pollInterval">Check interval (minutes):</label>
            <select id="pollInterval">
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div class="buttons">
            <button onclick="testNotification()">Test Notification</button>
            <button onclick="checkNow()">Check Now</button>
            <button onclick="saveSettings()">Save</button>
            <button onclick="window.close()">Cancel</button>
          </div>
          <script>
            // Settings will be handled by the preload script
          </script>
        </body>
      </html>
    `;

    this.settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(settingsHtml)}`);
    
    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow?.show();
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.tray) {
      this.tray.destroy();
    }
  }
}

// App event handlers
app.whenReady().then(async () => {
  const monitor = new ChangelogMonitor();
  await monitor.init();

  app.on('before-quit', () => {
    monitor.cleanup();
  });
});

app.on('window-all-closed', (event: Event) => {
  // Prevent the app from quitting when all windows are closed
  // We want to keep running in the system tray
  event.preventDefault();
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked
  // and there are no other windows open (not applicable here since we use tray)
});

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}