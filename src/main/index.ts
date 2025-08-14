import { app, ipcMain } from 'electron';
import { GitHubService } from '../services/GitHubService';
import { NotificationService } from '../services/NotificationService';
import { ConfigService } from '../services/ConfigService';
import { AppConfig } from '../types';

class ChangelogMonitor {
  private githubService!: GitHubService;
  private notificationService!: NotificationService;
  private configService!: ConfigService;
  private config!: AppConfig;
  // Tray and settings UI disabled due to macOS display issues
  private pollInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    this.configService = new ConfigService();
    this.config = await this.configService.loadConfig();
    
    this.githubService = new GitHubService(
      this.config.github.owner,
      this.config.github.repo,
      this.config.github.filePath,
      process.env.GITHUB_TOKEN,
      this.configService
    );
    
    this.notificationService = new NotificationService(this.config.notification.soundEnabled);
    
    // this.createTray(); // Disabled - macOS tray display issues
    this.setupIPC();
    this.startPolling();
  }

  // createTray() method disabled due to macOS display issues
  // private createTray(): void { ... }

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
      console.log('🔍 Checking for CHANGELOG.md updates...');
      const hasChanges = await this.githubService.checkForChanges();
      console.log('📊 Changes detected:', hasChanges);
      
      if (hasChanges && this.config.notification.enabled) {
        const latestVersion = await this.githubService.getLatestVersion();
        console.log('📦 Latest version:', latestVersion?.version);
        
        if (latestVersion) {
          const githubUrl = this.githubService.getCommitUrl();
          console.log('🔔 Sending notification for version:', latestVersion.version);
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
    setTimeout(() => this.checkForUpdates(), 2000); // Wait 2 seconds after startup
  }

  private restartPolling(): void {
    this.startPolling();
  }

  // Settings functionality disabled with tray removal
  // openSettings method removed - no UI access without tray

  cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    // if (this.tray) {
    //   this.tray.destroy();
    // }
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